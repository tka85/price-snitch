import Debug from 'debug';
import { name } from '../package.json';
import knex, { Knex } from 'knex';
import { TABLES } from './common/const';
import { DataConverter } from './DataConverter';
import { Price, Product } from './common/types';

const debug = Debug(`${name}:Datastore`);

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
        return await this.db(TABLES.products).select().where({ url }).first();
    }

    async getProductById(id: number): Promise<Product> {
        return await this.db(TABLES.products).select().where({ id }).first();
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
            debug(`Product "${dbProduct.descr ?? dbProduct.url}" already in db with id: ${dbProduct.id}`);
            assignedId = dbProduct.id;
        } else {
            [assignedId] = await this.db(TABLES.products)
                .insert(DataConverter.toDbProduct(product));
            debug(`Inserted new product "${product.descr ?? product.url}" and assigned id: ${assignedId}`);
        }
        return Promise.resolve(assignedId);
    }

    // This operation always inserts a new price record (differentiaded by `created` timestamp)
    async insertPrice(
        price: Price,
    ): Promise<void> {
        await this.db(TABLES.prices)
            .insert(DataConverter.toDbPrice(price));
        const prod = await this.getProductById(price.prodId);
        debug(`Added new price for product "${prod.descr ?? prod.url}":`, price);
        return Promise.resolve();
    }
}
