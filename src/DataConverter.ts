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
            notifyPriceIncreasePercent: dbProduct.notify_price_increase_percent,
            notifyPriceDecreasePercent: dbProduct.notify_price_decrease_percent,
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
            notify_price_increase_percent: product.notifyPriceIncreasePercent,
            notify_price_decrease_percent: product.notifyPriceDecreasePercent,
            created: product.created || (new Date()).toISOString(),
        };
    }

    static toPrice(dbPrice: DbPrice): Price {
        return {
            id: dbPrice.id,
            amount: parseInt(dbPrice.amount, 10),
            prodId: dbPrice.prod_id,
            created: dbPrice.created,
        };
    }

    static toDbPrice(price: WithoutId<Price>): WithoutId<DbPrice> {
        return {
            amount: price.amount.toFixed(0),
            prod_id: price.prodId,
            created: price.created || (new Date()).toISOString(),
        };
    }

    static toPriceChange(dbPriceChange: DbPriceChange): PriceChange {
        return {
            prodId: dbPriceChange.prod_id,
            fromAmount: parseInt(dbPriceChange.from_amount, 10),
            toAmount: parseInt(dbPriceChange.to_amount, 10),
            amountDiff: parseInt(dbPriceChange.amount_diff, 10),
            percentDiff: parseInt(dbPriceChange.percent_diff, 10),
            created: dbPriceChange.created,
        };
    }

    static toDbPriceChange(priceChange: WithoutId<PriceChange>): WithoutId<DbPriceChange> {
        return {
            prod_id: priceChange.prodId,
            from_amount: priceChange.fromAmount.toFixed(0),
            to_amount: priceChange.toAmount.toFixed(0),
            amount_diff: priceChange.amountDiff.toFixed(0),
            percent_diff: priceChange.percentDiff.toFixed(0),
            created: priceChange.created || (new Date()).toISOString(),
        };
    }


}
