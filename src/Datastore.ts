import { getLogger } from './common/utils';
import knex, { Knex } from 'knex';
import { TABLES } from './common/const';
import { DataConverter } from './DataConverter';
import { DbPriceChange, Price, Product } from './common/types';

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
                .orderBy('created', 'desc')
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
        await this.db(TABLES.prices)
            .insert(DataConverter.toDbPrice(price));
        const prod = await this.getProductById(price.prodId);
        log(`Added new price for product "${prod.descr ?? prod.url}":`, price);
        return Promise.resolve();
    }

    async insertInvalidPrice(prodId: number) {
        const invalidPrice = {
            amount: '-1',
            prodId,
            created: new Date().toISOString(),
        };
        log(`Inserting invalid price for product ${prodId}`);
        await this.db(TABLES.prices)
            .insert(DataConverter.toDbPrice(invalidPrice));
    }

    async evalProductPriceChange(prodId: number): Promise<DbPriceChange> {
        return await this.db.raw(`
        select prod_id, prev_amount, amount, amount - prev_amount as amount_diff, (amount - prev_amount) * 1.0 / prev_amount as percent_diff, created
        from (
                -- get price diff of last 2 readings
                select ${TABLES.prices}.*,
                        lag(amount) over (partition by prod_id order by created) as prev_amount
                from (
                    -- get most recent 2 readings per product
                    select id, amount, prod_id, created
                    from (select ${TABLES.prices}.*, row_number() over (partition by prod_id order by created desc) as rn
                        from ${TABLES.prices}
                        where prod_id = ${prodId} 
                            and amount <> -1) as ${TABLES.prices}
                    where rn in (1,2)) ${TABLES.prices}
            ) as ${TABLES.prices}
        where prev_amount is not null`);
    }
}
