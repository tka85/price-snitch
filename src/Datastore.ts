import { evalPercentDiff, getLogger } from './common/utils';
import knex, { Knex } from 'knex';
import { createLongNameId } from 'mnemonic-id';
import { CrawlData, INVALID_PRICE_CHANGE, Shop, TABLES, UserSubscriptionNotification } from './common/types';
import { Converter } from './Converter';
import { PriceChange, Notification, Product } from './common/types';
import { User } from './User';

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
        return (await this.db(TABLES.shops).select()).map(_ => Converter.toShop(_));
    }

    async getAllProductsByShopId(shopId: number): Promise<Product[]> {
        return (await this.db(TABLES.products)
            .select()
            .where({ shop_id: shopId }))
            .map(_ => Converter.toProduct(_));
    }

    async getProductByUrl(url: string): Promise<Product> {
        const result = await this.db(TABLES.products).select().where({ url }).first();
        return Converter.toProduct(result);
    }

    async getProductById(id: number): Promise<Product> {
        const result = await this.db(TABLES.products).select().where({ id }).first();
        return Converter.toProduct(result);
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
        return result.length ? result.map((dbPrice) => Converter.toPriceChange(dbPrice)) : [];
    }

    /**
     * Idempotent operation based on the product page's unique URL
     * @returns number          the id assigned to the inserted product
     */
    async insertProduct(product: Product): Promise<number> {
        let assignedId;
        if (await this.existsProduct(product.url)) {
            const dbProduct = await this.getProductByUrl(product.url);
            log(`Product "${dbProduct.title ?? dbProduct.url}" already in db with id: ${dbProduct.id}`);
            assignedId = dbProduct.id;
        } else {
            [assignedId] = await this.db(TABLES.products)
                .insert(Converter.toDbProduct(product));
            log(`Inserted new product "${product.title ?? product.url}" and assigned id: ${assignedId}`);
        }
        return Promise.resolve(assignedId);
    }

    // Append-only operation
    async insertPriceChange(crawlData: CrawlData): Promise<void> {
        const lastKnownPrice = await this.getLastKnownPrice(crawlData.prodId);
        let priceChange: PriceChange;
        if (!lastKnownPrice) {
            log(`No previous prices; adding first price:`, crawlData);
            priceChange = {
                prodId: crawlData.prodId,
                shopId: crawlData.shopId,
                amount: crawlData.amount,
                prevAmount: 0,
                amountDiff: 0,
                percentDiff: 0,
                created: new Date().toISOString(),
            };
            await this.db(TABLES.price_changes)
                .insert(Converter.toDbPriceChange(priceChange));
        } else {
            // This is the case as well when from "Currently unavailable" it becomes available again
            if (lastKnownPrice.amount !== crawlData.amount) {
                const fromAmount = lastKnownPrice.amount;
                const toAmount = crawlData.amount;
                log(`Detected price change for prodId ${crawlData.prodId} from ${fromAmount} to ${toAmount}`);
                priceChange = {
                    prodId: crawlData.prodId,
                    shopId: crawlData.shopId,
                    amount: crawlData.amount,
                    prevAmount: lastKnownPrice.amount,
                    amountDiff: crawlData.amount - lastKnownPrice.amount,
                    percentDiff: evalPercentDiff(fromAmount, toAmount),
                    created: new Date().toISOString(),
                };
                log(`Adding new price change for prodId ${crawlData.prodId}`, priceChange);
                await this.db(TABLES.price_changes)
                    .insert(Converter.toDbPriceChange(priceChange));
            } else {
                log(`No price change for prodId ${crawlData.prodId}; retains price ${lastKnownPrice.amount}`);
            }
        }
    }

    async insertInvalidPriceChange({ shopId, prodId }: { shopId: number, prodId: number }): Promise<void> {
        log(`Inserting invalid price for prodId ${prodId}`);
        const invalidPriceChange: PriceChange = Object.assign({ shopId, prodId }, INVALID_PRICE_CHANGE);
        await this.db(TABLES.price_changes)
            .insert(Converter.toDbPriceChange(invalidPriceChange))
    }

    async getSubscribedUserIds(prodIds: number[]) {
        return (await this.db(TABLES.subscriptions)
            .select('user_id')
            .whereIn('prod_id', prodIds))
            .map(_ => _.user_id);
    }

    /**
     * Fetches the last price change of each product
     */
    async getMostRecentPriceChanges(): Promise<PriceChange[]> {
        const result = await this.db.raw(`
        SELECT * 
        FROM (
            SELECT id, prod_id, shop_id, prev_amount, amount, amount_diff, percent_diff, 
                ROW_NUMBER() OVER (PARTITION BY prod_id ORDER BY id DESC) AS rn 
            FROM price_changes 
            WHERE amount>=0) 
        WHERE rn=1;
        `);
        if (result[0]) {
            return result.map(pc => Converter.toPriceChange(pc));
        }
        return [];
    }

    /**
     * NOTE: Includes user subscriptions for which no notification has been sent for each prod id
     * @param prodIds      number[]         called with prod ids of most recent price changes (may or may have not have had notifs sent out)
     * @returns 
     */
    async getMostRecentUserSubscriptionNotifications(prodIds: number[]): Promise<UserSubscriptionNotification[]> {
        const result = await this.db.raw(`
        SELECT user_id, prod_id, price_change_id, notify_max_frequency, 
            notify_price_increase_percent, notify_price_decrease_percent, created --refers to notification creation
        FROM
            (SELECT ROW_NUMBER() OVER (
                PARTITION BY us.user_id, us.prod_id ORDER BY n.id DESC) rn, 
                n.created, us.user_id, n.price_change_id, us.prod_id, us.notify_max_frequency, 
                us.notify_price_increase_percent, us.notify_price_decrease_percent, us.user_descr 
            FROM ( 
                SELECT user_id, prod_id, notify_max_frequency, 
                    notify_price_increase_percent, notify_price_decrease_percent, user_descr
                FROM users u, subscriptions s 
                WHERE s.prod_id in (${prodIds}) 
                    AND s.user_id=u.id) us 
                LEFT OUTER JOIN notifications n 
            ON
                n.user_id=us.user_id 
                AND us.prod_id=n.prod_id)
        WHERE rn=1;
        `);
        if (result[0]) {
            return result.map(userSubNotif => Converter.toUserSubscriptionNotification(userSubNotif));
        }
        return [];
    }

    async insertNotification(notification: Notification) {
        await this.db(TABLES.notifications)
            .insert(Converter.toDbNotification(notification));
        log(`Sent notification to user ${notification.userId} for price change ${notification.priceChangeId}`);
    }

    private async getLastKnownPrice(prodId: number): Promise<PriceChange | undefined> {
        const result = await this.db(TABLES.price_changes)
            .select()
            .where({ prod_id: prodId })
            .andWhere('amount', '>=', 0)
            .orderBy('id', 'desc')
            .limit(1)
            .first();

        if (!result) {
            return;
        }
        return Converter.toPriceChange(result);
    }

    async existsMoniker(moniker: string): Promise<boolean> {
        const result = await this.db(TABLES.users)
            .select(1)
            .where({ moniker })
            .first();

        return result ? true : false;
    }

    async getNewMoniker(): Promise<string> {
        let m = createLongNameId();
        while (await this.existsMoniker(m)) {
            m = createLongNameId();
        }
        return m;
    }

    async insertNewMoniker(moniker: string): Promise<boolean> {
        try {
            await this.db(TABLES.users)
                .insert(Converter.toDbUser(new User(moniker)));
        } catch (err) {
            return false;
        }
        return true;
    }
}
