import { DbPriceChange, DbNotification, DbProduct, PriceChange, Notification, Product, WithoutId, DbShop, Shop, DbUser, User, DbSubscription, Subscription } from './common/types';

export class DataConverter {
    static toShop(dbShop: DbShop): Shop {
        return {
            id: dbShop.id,
            name: dbShop.name,
            priceXpath: dbShop.price_xpath,
            priceLocateTimeout: dbShop.price_locate_timeout,
            priceLocateRetries: dbShop.price_locate_retries,
            priceCurrency: dbShop.price_currency,
            priceThousandSeparator: dbShop.price_thousand_separator,
            priceDecimalSeparator: dbShop.price_decimal_separator,
            priceRemoveChars: dbShop.price_remove_chars,
            created: dbShop.created,
        };
    }

    static toDbShop(shop: WithoutId<Shop>): DbShop {
        return {
            name: shop.name,
            price_xpath: shop.priceXpath,
            price_locate_timeout: shop.priceLocateTimeout,
            price_locate_retries: shop.priceLocateRetries,
            price_currency: shop.priceCurrency,
            price_thousand_separator: shop.priceThousandSeparator,
            price_decimal_separator: shop.priceDecimalSeparator,
            price_remove_chars: shop.priceRemoveChars,
            created: shop.created || (new Date()).toISOString(),
        };
    }

    static toUser(dbUser: DbUser): User {
        return {
            id: dbUser.id,
            moniker: dbUser.moniker,
            created: dbUser.created,
        };
    }

    static toDbUser(user: WithoutId<User>): DbUser {
        return {
            moniker: user.moniker,
            created: user.created || (new Date()).toISOString(),
        };
    }

    static toProduct(dbProduct: DbProduct): Product {
        return {
            id: dbProduct.id,
            shopId: dbProduct.shop_id,
            url: dbProduct.url,
            title: dbProduct.title,
            descr: dbProduct.descr,
            created: dbProduct.created,
        };
    }

    static toDbProduct(product: WithoutId<Product>): WithoutId<DbProduct> {
        return {
            shop_id: product.shopId,
            url: product.url,
            title: product.title,
            descr: product.descr,
            created: product.created || (new Date()).toISOString(),
        };
    }

    static toPriceChange(dbPriceChange: DbPriceChange): PriceChange {
        return {
            id: dbPriceChange.id,
            prodId: dbPriceChange.prod_id,
            amount: dbPriceChange.amount,
            prevAmount: dbPriceChange.prev_amount,
            amountDiff: dbPriceChange.amount_diff,
            percentDiff: dbPriceChange.percent_diff,
            created: dbPriceChange.created,
        };
    }

    static toDbPriceChange(priceChange: WithoutId<PriceChange>): WithoutId<DbPriceChange> {
        return {
            prod_id: priceChange.prodId,
            amount: priceChange.amount,
            prev_amount: priceChange.prevAmount,
            amount_diff: priceChange.amountDiff,
            percent_diff: priceChange.percentDiff,
            created: priceChange.created || (new Date()).toISOString(),
        };
    }

    static toSubscription(dbSubscription: DbSubscription): Subscription {
        return {
            userId: dbSubscription.user_id,
            prodId: dbSubscription.prod_id,
            notifyMaxFrequency: dbSubscription.notify_max_frequency,
            notifyPriceIncreasePercent: dbSubscription.notify_price_increase_percent,
            notifyPriceDecreasePercent: dbSubscription.notify_price_decrease_percent,
            created: dbSubscription.created,
        };
    }

    static toDbSubscription(subscription: WithoutId<Subscription>): WithoutId<DbSubscription> {
        return {
            user_id: subscription.userId,
            prod_id: subscription.prodId,
            notify_max_frequency: subscription.notifyMaxFrequency,
            notify_price_increase_percent: subscription.notifyPriceIncreasePercent,
            notify_price_decrease_percent: subscription.notifyPriceDecreasePercent,
            created: subscription.created || (new Date()).toISOString(),
        };
    }

    static toNotification(dbNotification: DbNotification): Notification {
        return {
            userId: dbNotification.user_id,
            priceId: dbNotification.price_id,
            created: dbNotification.created,
        };
    }

    static toDbNotification(notification: WithoutId<Notification>): WithoutId<DbNotification> {
        return {
            user_id: notification.userId,
            price_id: notification.priceId,
            created: notification.created || (new Date()).toISOString(),
        };
    }
}
