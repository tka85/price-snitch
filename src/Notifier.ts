import { getLogger } from './common/utils';
import { Product } from "./common/types";
import { Datastore } from "./Datastore";
import { ObjectFactory } from "./ObjectFactory";

const log = getLogger('Notifier');

export class Notifier {
    private datastore: Datastore;

    constructor() {
        this.datastore = ObjectFactory.getDatastore();
    }

    async sendSignificantPriceChangeNotification(prod: Product): Promise<void> {
        const priceChange = await this.datastore.evalProductPriceChange(prod.id!);
        if (priceChange.percent_diff <= prod.notifyPriceDecrease ||
            priceChange.percent_diff >= prod.notifyPriceIncrease) {
            await this.postNtfyService();
        } else {
            log(`Insignificant price change for ${prod.id} from ${priceChange.prev_amount} to ${priceChange.amount} [change: ${priceChange.percent_diff * 100}%]`);
        }
    }

    private postNtfyService() {
        log('>>> postNtfyService() not implemented yet');
    }
}