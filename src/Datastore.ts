import { evalPercentDiff, getLogger } from './common/utils';
import knex, { Knex } from 'knex';
import { TABLES } from './common/const';
import { DataConverter } from './DataConverter';
import { Price, PriceChange, Product } from './common/types';

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

    async getProductByUrl(url: string): Promise<Product> {
        const result = await this.db(TABLES.products).select().where({ url }).first();
        return DataConverter.toProduct(result);
    }

    async getProductById(id: number): Promise<Product> {
        const result = await this.db(TABLES.products).select().where({ id }).first();
        return DataConverter.toProduct(result);
    }

    async getPricesByProductId(productId: number, mostRecentLimit?: number): Promise<Price[]> {
        const query = this.db(TABLES.prices)
            .select()
            .where({ prod_id: productId });
        if (mostRecentLimit) {
            query
                .orderBy('id', 'desc')
                .limit(mostRecentLimit);
        }
        const result = await query;
        return result.length ? result.map((dbPrice) => DataConverter.toPrice(dbPrice)) : [];
    }

    /**
     * This is an idempotent operation based on the product page's unique URL
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

    // This operation always inserts a new price record (differentiaded by `created` timestamp)
    async insertPrice(price: Price): Promise<void> {
        const lastKnownPrice = await this.getLastKnownPrice(price.prodId);
        if (!lastKnownPrice) {
            log(`No previous prices; adding first price:`, price);
            await this.db(TABLES.prices)
                .insert(DataConverter.toDbPrice(price));
        } else {
            log(`Last known price for prod ${price.prodId}:`, lastKnownPrice.amount);
            if (lastKnownPrice.amount !== price.amount) {
                const fromAmount = lastKnownPrice.amount;
                const toAmount = price.amount;
                log(`Detected a price change for prod ${price.prodId} from ${fromAmount} to ${toAmount}`);
                await this.db(TABLES.prices)
                    .insert(DataConverter.toDbPrice(price));
                const priceChange: PriceChange = {
                    prodId: price.prodId,
                    fromAmount: lastKnownPrice.amount,
                    toAmount: price.amount,
                    amountDiff: toAmount - fromAmount,
                    percentDiff: evalPercentDiff(fromAmount, toAmount)
                };
                await this.insertPriceChange(priceChange);
                log(`Added price for prod ${price.prodId}`, price);
            } else {
                log(`No price change for prod ${price.prodId}; retaining last known price ${lastKnownPrice.amount}`);
            }
        }
        return Promise.resolve();
    }

    async insertInvalidPrice(prodId: number) {
        const invalidPrice: Price = {
            amount: -1,
            prodId,
            created: new Date().toISOString(),
        };
        log(`Inserting invalid price for prod ${prodId}`);
        await this.db(TABLES.prices)
            .insert(DataConverter.toDbPrice(invalidPrice));
    }

    async getSignificantPriceChange({
        prodId,
        significantPriceIncreasePercent,
        significantPriceDecreasePercent
    }): Promise<PriceChange | undefined> {
        const result = await this.db.raw(`
        SELECT prod_id, from_amount, to_amount, to_amount - from_amount as amount_diff, (to_amount - from_amount) * 100 / from_amount as percent_diff, created
        FROM (
                -- get price diff of last 2 reading
                SELECT id, LAG(amount) OVER (ORDER BY id) AS from_amount, amount AS to_amount, prod_id, created
                FROM (
                    -- get most recent 2 prices per product
                    SELECT id, amount, prod_id, created
                    FROM (
                        -- assign row numbers in reverse order of creation time i.e. most recent price row number = 1 etc.
                        SELECT prices.*, ROW_NUMBER() OVER (ORDER BY id DESC) AS rn
                        FROM ${TABLES.prices}
                        WHERE prod_id=${prodId} AND amount <> -1
                        ) AS ${TABLES.prices}
                    WHERE rn IN (1,2)
                ) ${TABLES.prices}
             ) AS ${TABLES.prices}
        WHERE from_amount IS NOT NULL 
            AND (percent_diff <= -${significantPriceDecreasePercent || Number.MAX_SAFE_INTEGER} 
                OR percent_diff >= ${significantPriceIncreasePercent || Number.MAX_SAFE_INTEGER})`);
        if (result[0]) {
            return DataConverter.toPriceChange(result[0]);
        }
    }

    private async insertPriceChange(priceChange: PriceChange) {
        await this.db(TABLES.priceChanges)
            .insert(DataConverter.toDbPriceChange(priceChange));
        log(`Added price change for prod ${priceChange.prodId}`, priceChange);
    }

    private async getLastKnownPrice(prodId: number): Promise<Price | undefined> {
        const result = await this.db(TABLES.prices)
            .select()
            .where({ prod_id: prodId })
            .orderBy('id', 'desc')
            .limit(1)
            .first();

        if (!result) {
            return;
        }
        return DataConverter.toPrice(result);
    }
}
