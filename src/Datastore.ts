import { evalPercentDiff, getLogger } from './common/utils';
import knex, { Knex } from 'knex';
import { CrawlPrice, INVALID_PRICE_CHANGE, Shop, TABLES } from './common/types';
import { DataConverter } from './DataConverter';
import { PriceChange, Notification, Product } from './common/types';

const log = getLogger('Datastore');
// const logError = getErrorLogger('Datastore');

export class Datastore {
    private db: Knex;

    constructor({ filename }) {
        this.db = knex({
            client: 'sqlite3',
            connection: { filename },
            useNullAsDefault: true,
        });
    }

    async existsProduct(url: string): Promise<boolean> {
        const result = await this.db(TABLES.products)
            .where({ url });
        if (!result || result.length === 0) {
            return false;
        }
        return true;
    }

    async getAllShops(): Promise<Shop[]> {
        return (await this.db(TABLES.shops).select()).map(_ => DataConverter.toShop(_));
    }

    async getAllProducts(): Promise<Product[]> {
        return (await this.db(TABLES.products).select()).map(_ => DataConverter.toProduct(_));
    }

    async getProductByUrl(url: string): Promise<Product> {
        const result = await this.db(TABLES.products).select().where({ url }).first();
        return DataConverter.toProduct(result);
    }

    async getProductById(id: number): Promise<Product> {
        const result = await this.db(TABLES.products).select().where({ id }).first();
        return DataConverter.toProduct(result);
    }

    async getPricesByProductId(prodId: number, mostRecentLimit?: number): Promise<PriceChange[]> {
        const query = this.db(TABLES.price_changes)
            .select()
            .where({ prod_id: prodId });
        if (mostRecentLimit) {
            query
                .orderBy('id', 'desc')
                .limit(mostRecentLimit);
        }
        const result = await query;
        return result.length ? result.map((dbPrice) => DataConverter.toPriceChange(dbPrice)) : [];
    }

    /**
     * Idempotent operation based on the product page's unique URL
     * @returns number          the id assigned to the inserted product
     */
    async insertProduct(product: Product): Promise<number> {
        let assignedId;
        if (await this.existsProduct(product.url)) {
            const dbProduct = await this.getProductByUrl(product.url);
            log(`Product "${dbProduct.descr ?? dbProduct.url}" already in db with id: ${dbProduct.id}`);
            assignedId = dbProduct.id;
        } else {
            [assignedId] = await this.db(TABLES.products)
                .insert(DataConverter.toDbProduct(product));
            log(`Inserted new product "${product.descr ?? product.url}" and assigned id: ${assignedId}`);
        }
        return Promise.resolve(assignedId);
    }

    // Append-only operation
    async insertPriceChange(crawlPrice: CrawlPrice): Promise<void> {
        const lastKnownPrice = await this.getLastKnownPrice(crawlPrice.prodId);
        let priceChange: PriceChange;
        if (!lastKnownPrice) {
            log(`No previous prices; adding first price:`, crawlPrice);
            priceChange = {
                prodId: crawlPrice.prodId,
                amount: crawlPrice.amount,
                prevAmount: 0,
                amountDiff: 0,
                percentDiff: 0,
                created: new Date().toISOString(),
            };
            await this.db(TABLES.price_changes)
                .insert(DataConverter.toDbPriceChange(priceChange));
        } else {
            if (lastKnownPrice.amount !== crawlPrice.amount) {
                const fromAmount = lastKnownPrice.amount;
                const toAmount = crawlPrice.amount;
                log(`Detected price change for prod ${crawlPrice.prodId} from ${fromAmount} to ${toAmount}`);
                priceChange = {
                    prodId: crawlPrice.prodId,
                    amount: crawlPrice.amount,
                    prevAmount: lastKnownPrice.amount,
                    amountDiff: crawlPrice.amount - lastKnownPrice.amount,
                    percentDiff: evalPercentDiff(fromAmount, toAmount),
                    created: new Date().toISOString(),
                };
                log(`Adding new price change for prod ${crawlPrice.prodId}`, priceChange);
                await this.db(TABLES.price_changes)
                    .insert(DataConverter.toDbPriceChange(priceChange));
            } else {
                log(`No price change for prod ${crawlPrice.prodId}; retains price ${lastKnownPrice.amount}`);
            }
        }
    }

    async insertInvalidPrice(prodId: number): Promise<void> {
        log(`Inserting invalid price for prod ${prodId}`);
        const invalidPriceChange: PriceChange = Object.assign({ prodId }, INVALID_PRICE_CHANGE);
        await this.db(TABLES.price_changes)
            .insert(DataConverter.toDbPriceChange(invalidPriceChange))
    }

    // async evalPriceChangeNotification({
    //     prodId,
    //     significantPriceIncreasePercent,
    //     significantPriceDecreasePercent
    // }): Promise<Notification | undefined> {
    //     const result = await this.db.raw(`
    //     SELECT prod_id, from_amount, to_amount, to_amount - from_amount as amount_diff, (to_amount - from_amount) * 100 / from_amount as percent_diff, created
    //     FROM (
    //             -- get price diff of last 2 reading
    //             SELECT id, LAG(amount) OVER (ORDER BY id) AS from_amount, amount AS to_amount, prod_id, created
    //             FROM (
    //                 -- get most recent 2 prices per product
    //                 SELECT id, amount, prod_id, created
    //                 FROM (
    //                     -- assign row numbers in reverse order of creation time i.e. most recent price row number = 1 etc.
    //                     SELECT prices.*, ROW_NUMBER() OVER (ORDER BY id DESC) AS rn
    //                     FROM ${TABLES.prices}
    //                     WHERE prod_id=${prodId} AND amount <> -1
    //                     ) AS ${TABLES.prices}
    //                 WHERE rn IN (1,2)
    //             ) ${TABLES.prices}
    //          ) AS ${TABLES.prices}
    //     WHERE from_amount IS NOT NULL 
    //         AND (percent_diff <= -${significantPriceDecreasePercent || Number.MAX_SAFE_INTEGER} 
    //             OR percent_diff >= ${significantPriceIncreasePercent || Number.MAX_SAFE_INTEGER})`);
    //     if (result[0]) {
    //         return DataConverter.toNotification(result[0]);
    //     }
    // }

    async insertNotification(notification: Notification) {
        await this.db(TABLES.notifications)
            .insert(DataConverter.toDbNotification(notification));
        log(`Sent notification to user ${notification.userId} for price change ${notification.priceId}`);
    }

    private async getLastKnownPrice(prodId: number): Promise<PriceChange | undefined> {
        const result = await this.db(TABLES.price_changes)
            .select()
            .where({ prod_id: prodId })
            .orderBy('id', 'desc')
            .limit(1)
            .first();

        if (!result) {
            return;
        }
        return DataConverter.toPriceChange(result);
    }
}
