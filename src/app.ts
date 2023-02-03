import Debug from 'debug';
import { name } from '../package.json';
import config from '../config.json';
import { ObjectFactory } from './ObjectFactory';
import { Product } from './common/types';
import { Crawler } from './Crawler';

const debug = Debug(`${name}:app`);
const error = Debug(`${name}:app:error`);

const datastore = ObjectFactory.getDatastore();
for (let p of config.products) {
    const product: Product = Object.assign({}, config.defaults, p);

    // TODO: UPSERT product


    debug(`Scanning product "${product.descr || product.url}"`);
    const crawler = new Crawler({
        datastore,
        webdriverParams: config.webdriver
    });

    crawler.scanProduct(product)
        .then((res) => debug(res))
        .catch(err => error(err));
}