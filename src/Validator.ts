import { Product, Subscription } from './common/types';
import url from 'url';
export class Validator {

    validateProduct(prod: Product): boolean {
        if (!this.validateUrl(prod.url)) {
            throw new Error(`Invalid product URL "${prod.url}"`);
        }
        return true;
    }

    validateSubscription(sub: Subscription): boolean {
        if (!sub.notifyPriceDecreasePercent && !sub.notifyPriceIncreasePercent) {
            throw new Error(`Subscription ${sub.id} should have at least one of 'notifyPriceDecreasePercent' and 'notifyPriceIncreasePercent'`);
        }
        return true;
    }

    // private validateCron(value: string): boolean {
    //     return value.match(/(((\d+,)+\d+|([\d\*]+(\/|-)\d+)|\d+|\*) ?){5,7}/) ? true : false;
    // }

    public validateUrl(value: string): boolean {
        try {
            url.parse(value);
        } catch (err) {
            return false;
        }
        return true;
    }
}