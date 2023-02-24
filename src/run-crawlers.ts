import config from '../config.json';
import { ObjectFactory } from './ObjectFactory';
import { Crawler } from './Crawler';
import { getErrorLogger, getLogger } from './common/utils';
import Pool from 'promise-pool-js';
import { CrawlData, INVALID_PRICE_AMOUNT } from './common/types';

const log = getLogger('run-crawlers');
const logError = getErrorLogger('run-crawlers');
const datastore = ObjectFactory.getDatastore();
const pool = new Pool({
    size: config.crawler.poolSize,
    strategy: 'round-robin'
});

pool.on('after.each', async (data) => {
    const discoveredData: CrawlData[] = data.result;
    for (const crawlPrice of discoveredData) {
        try {
            if (crawlPrice.amount !== INVALID_PRICE_AMOUNT) {
                await datastore.insertPriceChange(crawlPrice);
            } else {
                // Leave trace in DB that we couldn't locate price for this prodId
                await datastore.insertInvalidPriceChange({shopId: crawlPrice.shopId, prodId: crawlPrice.prodId});
            }
        } catch (err) {
            logError(err);
        }
    }
});

(async () => {
    while(true) {
        log(`Refilling execution pool with crawlers`);
        await refillCrawlersPool();
        log(`Pool refilled`);
        await pool.all();
        log(`All pool crawlers finished!`);
    }
})()
    .catch(err => {
        logError(err); process.exit(1);
    });

    async function refillCrawlersPool() {
        const allShops = await datastore.getAllShops();
        for (let shopIndex = 0; shopIndex < allShops.length; shopIndex++) {
            const shop = allShops[shopIndex];
            const allProducts = await datastore.getAllProductsByShopId(shop.id!);
            log(`Processing all products (${allProducts.length}) of shop  for shop "${shop.name}"`);

            for (let prodIndex = 0; prodIndex < allProducts.length; prodIndex++) {
                let prodIdUrlMap: Map<number, string> = new Map();
                // Construct crawler that will handle this batch
                const crawler: Crawler = new Crawler({
                    webdriverParams: config.webdriver
                });
                
                // Construct batch map for next crawler
                log(`Building crawler "${crawler.name}" batch (${config.crawler.productsPerCrawler} products)`);
                for (let i = 0; i < config.crawler.productsPerCrawler; i++) {
                    const prod = allProducts[prodIndex];
                    if (prod) {
                        log(`> Adding prodId ${prod.id} into batch`);
                        prodIdUrlMap.set(prod.id!, prod.url!);
                        prodIndex++;
                    }
                }
                // Cancel out last incrementing or else we skip a product
                prodIndex--;
                // Add new crawler to pool
                try {
                    log(`Scheduling crawler "${crawler.name}" (prodIds: ${[...prodIdUrlMap.keys()]}) for execution`);
                    pool.schedule(crawler.crawlProductPages.bind(crawler, {
                        shopId: shop.id!,
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
    }
