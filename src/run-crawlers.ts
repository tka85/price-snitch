import config from '../config.json';
import { ObjectFactory } from './ObjectFactory';
import { Crawler } from './Crawler';
import { getErrorLogger } from './common/utils';
import Pool from 'promise-pool-js';
import { CrawlData, INVALID_PRICE_AMOUNT } from './common/types';

const logError = getErrorLogger('run-crawlers');
const datastore = ObjectFactory.getDatastore();
const pool = new Pool({
    size: config.crawler.poolSize,
    strategy: 'round-robin'
});

pool.on('after.each', async (discoveredData: CrawlData[]) => {
    // console.log(`>>>>>>>>>>>>>>>>>>>> discoveredData`, INVALID_PRICE_AMOUNT, discoveredData);
    for (const crawlPrice of discoveredData) {
        try {
            if (crawlPrice.amount !== INVALID_PRICE_AMOUNT) {
                await datastore.insertPriceChange(crawlPrice);
            } else {
                // Leave trace in DB that we couldn't locate price for this prodId
                await datastore.insertInvalidPriceChange(crawlPrice.prodId);
            }
        } catch (err) {
            logError(err);
        }
    }
});

(async () => {
    while (true) {
        const allShops = await datastore.getAllShops();
        for (let shopIndex = 0; shopIndex < allShops.length; shopIndex++) {
            const shop = allShops[shopIndex];
            const allProducts = await datastore.getAllProductsByShopId(shop.id!);

            for (let prodIndex = 0; prodIndex < allProducts.length; prodIndex++) {
                let prodIdUrlMap: Map<number, string> = new Map();
                // Construct batch for next crawler
                for (let i = 0; i < config.crawler.productsPerCrawler; i++) {
                    const prod = allProducts[prodIndex];
                    if (prod) {
                        prodIdUrlMap.set(prod.id!, prod.url!);
                        prodIndex++;
                    }
                }
                // Cancel out last incrementing or else we skip a product
                prodIndex--;

                const crawler: Crawler = new Crawler({
                    webdriverParams: config.webdriver
                });
                try {
                    pool.schedule(crawler.crawlProductPages.bind(crawler, {
                        prodIdUrlMap,
                        priceLocateRetries: shop.priceLocateRetries,
                        priceXpath: shop.priceXpath,
                        priceLocateTimeout: shop.priceLocateTimeout,
                        priceRemoveChars: shop.priceRemoveChars,
                        priceThousandSeparator: shop.priceThousandSeparator,
                        priceDecimalSeparator: shop.priceDecimalSeparator,
                    }));
                } catch (err) {
                    logError(err);
                }
            }
        }
        pool.all().then(_ => console.log('@@@@@@@@@@@@22 pool.all() called!!!', _));
    }
})()
    .catch(err => {
        logError(err); process.exit(1);
    });