import { DbPrice, DbProduct, Price, Product, WithoutId } from './common/types';

export class DataConverter {
    static toProduct(dbProduct: DbProduct): Product {
        return {
            id: dbProduct.id,
            url: dbProduct.url,
            descr: dbProduct.descr,
            cron: dbProduct.cron,
            priceElementLocator: dbProduct.price_element_locator,
            priceLocateTimeout: dbProduct.price_locate_timeout,
            priceCurrency: dbProduct.price_currency,
            priceThousandSeparator: dbProduct.price_thousand_separator,
            priceDecimalSeparator: dbProduct.price_decimal_separator,
            priceRemoveChars: dbProduct.price_remove_chars_regex,
            notifyPriceIncreaseRatio: dbProduct.notify_price_increase_ratio,
            notifyPriceDecreaseRatio: dbProduct.notify_price_decrease_ratio,
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
            price_currency: product.priceCurrency,
            price_thousand_separator: product.priceThousandSeparator,
            price_decimal_separator: product.priceDecimalSeparator,
            price_remove_chars_regex: product.priceRemoveChars,
            notify_price_increase_ratio: product.notifyPriceIncreaseRatio,
            notify_price_decrease_ratio: product.notifyPriceDecreaseRatio,
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


}
