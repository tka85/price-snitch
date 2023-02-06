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
    const crawler = new Crawler({
        webdriverParams: config.webdriver
    });
    const scheduler = new Scheduler();

    for (let p of config.products) {
        const product: Product = Object.assign({}, config.defaults, p);
        try {
            validator.validateProduct(product);
        } catch (err) {
            continue;
        }

        try {
            // Insert product if not in db; get the assigned id
            product.id = await datastore.insertProduct(product);
        } catch (err) {
            continue;
        }

        await scheduler.loadCron(product.id);
    }

    while (true) {
        const matureProdIds = scheduler.getMatureProdIds();
        if (matureProdIds.length) {
            log('Mature', matureProdIds);
            for (const pid of matureProdIds) {
                const product = await datastore.getProductById(pid);
                log(`Scanning price for "${product.descr || product.url}"`);
                const price = await crawler.scanProduct(product);
                if (price) {
                    await datastore.insertPrice(price);
                    log('Inserted price', price);
                }
            }
        }
        log('sleep 1000');
        await sleep(1000);
    }

    crawler.shutdown().then(() => { process.exit(0); });
})()
    .catch(err => {
        logError(err); process.exit(1);
    });