import { getLogger } from './common/utils';
import { Product } from "./common/types";
import { Datastore } from "./Datastore";
import { ObjectFactory } from "./ObjectFactory";
import fetch from 'node-fetch';

const log = getLogger('Notifier');
const NTFY_SERVER = 'http://192.168.2.124:8080/price-snitch';

export class Notifier {
    private datastore: Datastore;

    constructor() {
        this.datastore = ObjectFactory.getDatastore();
    }

    async sendSignificantPriceChangeNotification(prod: Product): Promise<void> {
        const sigPriceChange = await this.datastore.getSignificantPriceChange({
            prodId: prod.id!,
            significantPriceIncreasePercent: prod.notifyPriceIncreasePercent,
            significantPriceDecreasePercent: prod.notifyPriceDecreasePercent
        });
        if (sigPriceChange) {
            log('Detected significant price change: ', sigPriceChange);
            await this.postNtfyService({ prodDescr: prod.descr, prodUrl: prod.url, priceChange: sigPriceChange });
        }
    }

    private async postNtfyService(params: {
        prodDescr,
        prodUrl,
        priceChange
    }) {
        log(`POSTing ntfy service ${NTFY_SERVER}`)
        const token_request = await fetch(NTFY_SERVER, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params, null, 4)
        });
        const { response } = await token_request.json();
        log('Ntfy service responded', response);
    }
}