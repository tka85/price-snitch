import { DbPrice, DbPriceChange, DbProduct, Price, PriceChange, Product, WithoutId } from './common/types';

export class DataConverter {
    static toProduct(dbProduct: DbProduct): Product {
        return {
            id: dbProduct.id,
            url: dbProduct.url,
            descr: dbProduct.descr,
            cron: dbProduct.cron,
            priceElementLocator: dbProduct.price_element_locator,
            priceLocateTimeout: dbProduct.price_locate_timeout,
            priceLocateRetries: dbProduct.price_locate_retries,
            priceCurrency: dbProduct.price_currency,
            priceThousandSeparator: dbProduct.price_thousand_separator,
            priceDecimalSeparator: dbProduct.price_decimal_separator,
            priceRemoveChars: dbProduct.price_remove_chars_regex,
            notifyPriceIncrease: dbProduct.notify_price_increase,
            notifyPriceDecrease: dbProduct.notify_price_decrease,
            created: dbProduct.created,
        };
    }

    static toDbProduct(product: WithoutId<Product>): WithoutId<DbProduct> {
        return {
            url: product.url,
            descr: product.descr,
            cron: product.cron,
            price_element_locator: product.priceElementLocator,
            price_locate_timeout: product.priceLocateTimeout,
            price_locate_retries: product.priceLocateRetries,
            price_currency: product.priceCurrency,
            price_thousand_separator: product.priceThousandSeparator,
            price_decimal_separator: product.priceDecimalSeparator,
            price_remove_chars_regex: product.priceRemoveChars,
            notify_price_increase: product.notifyPriceIncrease,
            notify_price_decrease: product.notifyPriceDecrease,
            created: product.created,
        };
    }

    static toPrice(dbPrice: DbPrice): Price {
        return {
            id: dbPrice.id,
            amount: dbPrice.amount,
            prodId: dbPrice.prod_id,
            created: dbPrice.created,
        };
    }

    static toDbPrice(price: WithoutId<Price>): WithoutId<DbPrice> {
        return {
            amount: price.amount,
            prod_id: price.prodId,
            created: price.created,
        };
    }

    static toPriceChange(dbPriceChange: DbPriceChange): PriceChange {
        return {
            prodId: dbPriceChange.prod_id,
            prevAmount: dbPriceChange.prev_amount,
            amount: dbPriceChange.amount,
            amountDiff: dbPriceChange.amount_diff,
            percentDiff: dbPriceChange.percent_diff,
            created: dbPriceChange.created,
        };
    }

    static toDbPriceChange(priceChange: WithoutId<PriceChange>): WithoutId<DbPriceChange> {
        return {
            prod_id: priceChange.prodId,
            prev_amount: priceChange.prevAmount,
            amount: priceChange.amount,
            amount_diff: priceChange.amountDiff,
            percent_diff: priceChange.percentDiff,
            created: priceChange.created,
        };
    }


}
