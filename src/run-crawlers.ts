import config from '../config.json';
import { ObjectFactory } from './ObjectFactory';
import { Crawler } from './Crawler';
import { getLogger, getErrorLogger } from './common/utils';

const log = getLogger('run-crawlers');
const logError = getErrorLogger('run-crawlers');

(async () => {
    const datastore = ObjectFactory.getDatastore();
    let crawler: Crawler;

    const allShops = await datastore.getAllShops();
    const allProducts = await datastore.getAllProducts();

    // The products are all validated upon insert; not here

    while (true) {
        for (const shop of allShops) {
            crawler = new Crawler({
                webdriverParams: config.webdriver
            });
            for (const prod of allProducts) {
                log(`Scanning shop "${shop.name}" for prod "${prod.descr || prod.url}`);
                try {
                    const crawlPrice = await crawler.crawlProductPage({
                        prodId: prod.id!,
                        url: prod.url,
                        priceLocateRetries: shop.priceLocateRetries,
                        priceXpath: shop.priceXpath,
                        priceLocateTimeout: shop.priceLocateTimeout,
                        priceRemoveChars: shop.priceRemoveChars,
                        priceThousandSeparator: shop.priceThousandSeparator,
                        priceDecimalSeparator: shop.priceDecimalSeparator,
                    });
                    if (crawlPrice) {
                        await datastore.insertPriceChange(crawlPrice);
                    } else {
                        // Leave trace in DB that we couldn't locate price in webpage
                        await datastore.insertInvalidPrice(prod.id!);
                    }
                } catch (err) {
                    logError(err);
                }
            }
            // Refresh crawler for each shop iterration
            await crawler.shutdown();
        }
    }
})()
    .catch(err => {
        logError(err); process.exit(1);
    });