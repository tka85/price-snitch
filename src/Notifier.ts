// import { getLogger } from './common/utils';
// import { Notification, Product } from "./common/types";
// import { Datastore } from "./Datastore";
// import { ObjectFactory } from "./ObjectFactory";
// import fetch from 'node-fetch';

// const log = getLogger('Notifier');
// const NTFY_SERVER = 'http://pihole.lan:8080/price-snitch';

// export class Notifier {
//     private datastore: Datastore;

//     constructor() {
//         this.datastore = ObjectFactory.getDatastore();
//     }

//     async sendSignificantPriceChangeNotification(prod: Product): Promise<void> {
//         const priceChangeNotification = await this.datastore.evalPriceChangeNotification({
//             prodId: prod.id!,
//             significantPriceIncreasePercent: prod.notifyPriceIncreasePercent,
//             significantPriceDecreasePercent: prod.notifyPriceDecreasePercent
//         });
//         if (priceChangeNotification) {
//             log('Detected significant price change; emitting notification:', priceChangeNotification);
//             await this.datastore.insertNotification(priceChangeNotification);
//             await this.postNtfyService(priceChangeNotification);
//         }
//     }

//     private async postNtfyService(notification: Notification): Promise<void> {
//         log(`Sending price change notification to ntfy service ${NTFY_SERVER}`)
//         await fetch(NTFY_SERVER, {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify(notification, null, 4)
//         });
//     }
// }
