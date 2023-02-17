import config from '../config.json';
import { ObjectFactory } from './ObjectFactory';
import { Product } from './common/types';
import { Crawler } from './Crawler';
import { Scheduler } from './Scheduler';
import { getLogger, getErrorLogger, sleep } from './common/utils';

const log = getLogger('app');
const logError = getErrorLogger('app');

(async () => {
    const datastore = ObjectFactory.getDatastore();
    const validator = ObjectFactory.getValidator();
    const notifier = ObjectFactory.getNotifier();
    const crawler = new Crawler({
        webdriverParams: config.webdriver
    });
    const scheduler = new Scheduler();

    for (let p of config.products) {
        const product: Product = Object.assign({}, config.defaults, p);
        try {
            validator.validateProduct(product);
        } catch (err) {
            logError(err);
            continue;
        }

        try {
            // Insert product if not in db; get the assigned id
            product.id = await datastore.insertProduct(product);
        } catch (err) {
            logError(`Product "${product.url}" failed validation`, err);
            continue;
        }

        await scheduler.loadRuntimes(product.id);
    }

    while (true) {
        const matureProdIds = scheduler.getMatureProdIds();
        for (const pid of matureProdIds) {
            const product = await datastore.getProductById(pid);
            log(`Scanning price for prod ${pid} ["${product.descr || product.url}]`);
            try {
                const price = await crawler.scanProduct(product);
                if (price) {
                    await datastore.insertPrice(price);
                    await notifier.sendSignificantPriceChangeNotification(product);
                } else {
                    // Leave trace in DB that we couldn't locate price in webpage
                    await datastore.insertInvalidPrice(pid);
                }
            } catch (err) {
                logError(err);
            }
            // await crawler.shutdown();
        }
        await crawler.shutdown();
        await scheduler.checkCronmapRefills();
        const sleepTimeMs = 10000;
        log(`sleeping ${sleepTimeMs / 1000 / 60} minutes...`);
        await sleep(sleepTimeMs);
    }

    // crawler.shutdown().then(() => { process.exit(0); });
})()
    .catch(err => {
        logError(err); process.exit(1);
    });