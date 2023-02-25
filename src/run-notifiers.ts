import { getErrorLogger, getLogger } from './common/utils';
import { ObjectFactory } from './ObjectFactory';

const log = getLogger('run-notifiers');
const logError = getErrorLogger('run-notifiers');
const datastore = ObjectFactory.getDatastore();

(async () => {
    // while (true) {
    const lastPriceChanges = await datastore.getMostRecentPriceChanges();
    for (const pc of lastPriceChanges) {
        const userIdsSubscribed = await datastore.getSubscribedUserIdsByProdId(pc.prodId);

        log(pc);
        log('User id subscribed:', userIdsSubscribed)
    }
    // }
})()
    .catch(err => {
        logError(err); process.exit(1);
    });