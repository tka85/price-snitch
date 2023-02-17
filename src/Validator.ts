import { Product } from './common/types';
import url from 'url';
export class Validator {

    validateProduct(prod: Product): boolean {
        if (!this.validateCron(prod.cron)) {
            throw new Error(`Invalid cron expression "${prod.cron}"`);
        };
        if (!this.validateUrl(prod.url)) {
            throw new Error(`Invalid product URL "${prod.url}"`);
        }
        if (!prod.notifyPriceDecreasePercent && !prod.notifyPriceIncreasePercent) {
            throw new Error(`Product ${prod.url} is configured with null for both 'notifyPriceDecreasePercent' and 'notifyPriceIncreasePercent'`);
        }
        return true;
    }

    private validateCron(value: string): boolean {
        return value.match(/(((\d+,)+\d+|([\d\*]+(\/|-)\d+)|\d+|\*) ?){5,7}/) ? true : false;
    }

    private validateUrl(value: string): boolean {
        try {
            url.parse(value);
        } catch (err) {
            return false;
        }
        return true;
    }
}