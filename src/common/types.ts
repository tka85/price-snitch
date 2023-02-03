import { Datastore } from "../Datastore";

export type WithoutId<T> = Omit<T, 'id'>;

export type CrawlerWebdriverParams = {
    disableExtensions: boolean;
    incognito: boolean;
    headless: boolean;
    proxyServerUrl: string | null;
};

export type CrawlerParams = {
    datastore: Datastore;
    webdriverParams?: CrawlerWebdriverParams;
};

export type Product = {
    id?: number;
    url: string;
    descr?: string;
    cron: string;
    priceElementLocator: string;
    priceLocateTimeout: number;
    priceCurrency: string;
    priceThousandSeparator: string;
    priceDecimalSeparator: string;
    priceRemoveCharsRegex: string;
    notifyPriceIncreaseRatio: number;
    notifyPriceDecreaseRatio: number;
    created?: string;
};

export type DbProduct = {
    id: number;
    url: string;
    descr?: string;
    cron: string;
    price_element_locator: string;
    price_locate_timeout: number;
    price_currency: string;
    price_thousand_separator: string;
    price_decimal_separator: string;
    price_remove_chars_regex: string;
    notify_price_increase_ratio: number;
    notify_price_decrease_ratio: number;
    created?: string;
};

export type Price = {
    id?: number;
    amount: number;
    prodId: number;
    created?: string;
};

export type DbPrice = {
    id?: number;
    amount: number;
    prod_id: number;
    created?: string;
};
