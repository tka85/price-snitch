export type WithoutId<T> = Omit<T, 'id'>;

export type CrawlerWebdriverParams = {
    disableExtensions: boolean;
    incognito: boolean;
    headless: boolean;
    proxyServerUrl: string | null;
};

export type CrawlerParams = {
    webdriverParams?: CrawlerWebdriverParams;
};

export type Product = {
    id?: number;
    url: string;
    descr?: string;
    cron: string;
    priceElementLocator: string;
    priceLocateTimeout: number;
    priceLocateRetries: number;
    priceCurrency: string;
    priceThousandSeparator: string;
    priceDecimalSeparator: string;
    priceRemoveChars: RegExp | string;
    notifyPriceIncrease: number;
    notifyPriceDecrease: number;
    created?: string;
};

export type DbProduct = {
    id: number;
    url: string;
    descr?: string;
    cron: string;
    price_element_locator: string;
    price_locate_timeout: number;
    price_locate_retries: number;
    price_currency: string;
    price_thousand_separator: string;
    price_decimal_separator: string;
    price_remove_chars_regex: RegExp | string;
    notify_price_increase: number;
    notify_price_decrease: number;
    created?: string;
};

export type Price = {
    id?: number;
    amount: string;
    prodId: number;
    created?: string;
};

export type DbPrice = {
    id?: number;
    amount: string;
    prod_id: number;
    created?: string;
};

export type PriceChange = {
    prodId: number;
    prevAmount: string;
    amount: string;
    amountDiff: string;
    percentDiff: number;
    created: string;
};

export type DbPriceChange = {
    prod_id: number;
    prev_amount: string;
    amount: string;
    amount_diff: string;
    percent_diff: number;
    created: string;
};