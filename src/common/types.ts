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

export const INVALID_PRICE_AMOUNT = -1;

export const INVALID_PRICE_CHANGE = {
    amount: INVALID_PRICE_AMOUNT,
    prevAmount: INVALID_PRICE_AMOUNT,
    amountDiff: INVALID_PRICE_AMOUNT,
    percentDiff: INVALID_PRICE_AMOUNT,
    created: new Date().toISOString(),
};

export type CrawlerWebdriverParams = {
    disableExtensions: boolean;
    incognito: boolean;
    headless: boolean;
    proxyServerUrl: string | null;
};

export type CrawlerParams = {
    shopParams: Shop;
    webdriverParams?: CrawlerWebdriverParams;
};

export type CrawlProductPage = {
    url: string;
    priceXpath: string;
}

export type CrawlData = {
    crawlerName: string;
    prodId: number;
    shopId: number;
    amount: number;
    //TODO: extract prod title from page and update in db if it has changed
    title?: string;
};

export type Shop = {
    id?: number;
    name: string;
    priceXpaths: string[]; // all the different xpath locators for price
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
    price_xpaths: string; // stringified JSON array of strings; all the different xpath locators for price
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
    priceXpath: string;
    title?: string;
    created?: string;
};

export type DbProduct = {
    id: number;
    shop_id: number;
    url: string;
    price_xpath: string;
    title?: string;
    created: string;
};

export type PriceChange = {
    id?: number;
    prodId: number;
    shopId: number;
    amount: number;
    prevAmount: number;
    amountDiff: number;
    percentDiff: number;
    created?: string;
};

export type DbPriceChange = {
    id?: number;
    prod_id: number;
    shop_id: number;
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
    userNote?: number;
    created?: string;
};

export type DbSubscription = {
    id?: number;
    user_id: number;
    prod_id: number;
    notify_max_frequency: MAX_NOTIFICATION_FREQUENCY;
    notify_price_increase_percent?: number;
    notify_price_decrease_percent?: number;
    user_note?: number;
    created: string;
};

export type Notification = {
    id?: number;
    userId: number;
    priceChangeId: number;
    shopId: number;
    created?: string;
};

export type DbNotification = {
    id?: number;
    user_id: number;
    price_change_id: number;
    shop_id: number;
    created: string;
};