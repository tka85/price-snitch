import { Product } from "./common/types";

export class Validator {

    validateProduct(prod: Product): boolean {
        if (!this.validateCron(prod.cron)) {
            throw new Error(`Invalid cron expression ${prod.cron}`);
        };
        return true;
    }

    private validateCron(value: string): boolean {
        return value.match(/(((\d+,)+\d+|([\d\*]+(\/|-)\d+)|\d+|\*) ?){5,7}/) ? true : false;
    }
}