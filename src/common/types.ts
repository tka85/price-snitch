export type WithoutId<T> = Omit<T, 'id'>;

export enum TABLES {
    shops = 'shops',
    users = 'users',
    products = 'products',
    price_changes = 'price_changes',
    subscriptions = 'subscriptions',
    notifications = 'notifications',
};

export enum MAX_NOTIFICATION_FREQUENCY {
    realtime = 0,
    bidaily = 1,
    daily = 2,
    weekly = 3,
};

export const INVALID_PRICE_CHANGE: Omit<PriceChange, 'prodId'> = {
    amount: -1,
    prevAmount: -1,
    amountDiff: -1,
    percentDiff: -1,
    created: new Date().toISOString(),
};

export type CrawlerWebdriverParams = {
    disableExtensions: boolean;
    incognito: boolean;
    headless: boolean;
    proxyServerUrl: string | null;
};

export type CrawlerParams = {
    webdriverParams?: CrawlerWebdriverParams;
};

export type CrawlPageInput = {
    prodId: number;
    url: string;
    priceLocateRetries: number;
    priceXpath: string;
    priceLocateTimeout: number;
    priceRemoveChars: RegExp | string;
    priceThousandSeparator: string;
    priceDecimalSeparator: string;
};

export type CrawlPrice = {
    prodId: number;
    amount: number;
};

export type Shop = {
    id?: number;
    name: string;
    priceXpath: string;
    priceLocateTimeout: number;
    priceLocateRetries: number;
    priceCurrency: string;
    priceThousandSeparator: string;
    priceDecimalSeparator: string;
    priceRemoveChars: RegExp | string;
    created?: string;
};

export type DbShop = {
    id?: number;
    name: string;
    price_xpath: string;
    price_locate_timeout: number;
    price_locate_retries: number;
    price_currency: string;
    price_thousand_separator: string;
    price_decimal_separator: string;
    price_remove_chars: RegExp | string;
    created: string;
};

export type User = {
    id?: number;
    moniker: string;
    created?: string;
};

export type DbUser = {
    id?: number;
    moniker: string;
    created: string;
};

export type Product = {
    id?: number;
    shopId: number;
    url: string;
    title?: string;
    descr?: string;
    created?: string;
};

export type DbProduct = {
    id: number;
    shop_id: number;
    url: string;
    title?: string;
    descr?: string;
    created: string;
};

export type PriceChange = {
    id?: number;
    prodId: number;
    amount: number;
    prevAmount: number;
    amountDiff: number;
    percentDiff: number;
    created?: string;
};

export type DbPriceChange = {
    id?: number;
    prod_id: number;
    amount: number;
    prev_amount: number;
    amount_diff: number;
    percent_diff: number;
    created: string;
};

export type Subscription = {
    id?: number;
    userId: number;
    prodId: number;
    notifyMaxFrequency: MAX_NOTIFICATION_FREQUENCY;
    notifyPriceIncreasePercent?: number;
    notifyPriceDecreasePercent?: number;
    userDescr?: number;
    created?: string;
};

export type DbSubscription = {
    id?: number;
    user_id: number;
    prod_id: number;
    notify_max_frequency: MAX_NOTIFICATION_FREQUENCY;
    notify_price_increase_percent?: number;
    notify_price_decrease_percent?: number;
    user_descr?: number;
    created: string;
};

export type Notification = {
    id?: number;
    userId: number;
    priceId: number;
    created?: string;
};

export type DbNotification = {
    id?: number;
    user_id: number;
    price_id: number;
    created: string;
};