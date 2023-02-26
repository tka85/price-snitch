import { MAX_NOTIFICATION_FREQUENCY, MS_IN_A, PriceChange, UserSubscriptionNotification } from './common/types';
import { getErrorLogger, getLogger, sleep } from './common/utils';
import { ObjectFactory } from './ObjectFactory';

const log = getLogger('run-notifiers');
const logError = getErrorLogger('run-notifiers');
const datastore = ObjectFactory.getDatastore();

function shouldSendNotification(priceChange: PriceChange, userSubNotif: UserSubscriptionNotification): boolean {
    userSubNotif.notifyMaxFrequency
    if (priceChange.prodId === userSubNotif.prodId &&
        priceChange.id! > userSubNotif.priceChangeId &&
        (priceChange.percentDiff <= -userSubNotif.notifyPriceDecreasePercent ||
            priceChange.percentDiff >= userSubNotif.notifyPriceIncreasePercent
        )
    ) {
        // Also check we don't violate max notification frequency
        if (userSubNotif.notifyMaxFrequency !== MAX_NOTIFICATION_FREQUENCY.realtime) {
            const lastNotifDate = new Date(userSubNotif.created);
            const msSinceLastNotif = (new Date()).getTime() - lastNotifDate.getTime();
            switch(userSubNotif.notifyMaxFrequency) {
                case MAX_NOTIFICATION_FREQUENCY.bidaily:
                    if (msSinceLastNotif <= MS_IN_A.halfday) {
                        return false;
                    }
                    break;
                case MAX_NOTIFICATION_FREQUENCY.daily:
                    if (msSinceLastNotif <= MS_IN_A.day) {
                        return false;
                    }
                    break;
                case MAX_NOTIFICATION_FREQUENCY.weekly:
                    if (msSinceLastNotif <= MS_IN_A.week) {
                        return false;
                    }
                    break;
            }
        }
        return true;
    }
    return false;
}

(async () => {
    while (true) {
        const latestPriceChanges = await datastore.getMostRecentPriceChanges();
        const changedProdIds = latestPriceChanges.map(_ => _.prodId);
        // Get for each changedProdId:
        //  * <user_id, prod_id, price_change_id> == for users subscribed to this product who have received at least one notification already for this prod_id
        //  * <user_id, prod_id, NULL> == for users subscribed to this product who have never a notification before
        const latestUserSubNotifs = await datastore.getMostRecentUserSubscriptionNotifications(changedProdIds);
        for(const pc of latestPriceChanges) {
            for(const usn of latestUserSubNotifs) {
                // log(`Checking ${JSON.stringify(pc)} against userSubNotif: ${JSON.stringify(usn)}>`);
                if (shouldSendNotification(pc, usn)) {
                    // TODO: send notification
                    log(`>>> Will send notification to user ${usn.userId} priceChange ${pc.id} for product ${usn.prodId}`);
                }
            }
        }
        log(`Sleeping 5s`);
        await sleep(5000);
    }
})()
    .catch(err => {
        logError(err); process.exit(1);
    });