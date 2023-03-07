import fetch from 'node-fetch';
import {/*  NOTIF_VERSIONS,  */Notification, PriceChange, UserSubscriptionNotification } from './common/types';
import { getErrorLogger, getLogger, sleep } from './common/utils';
import { ObjectFactory } from './ObjectFactory';

const log = getLogger('run-notifiers');
const logError = getErrorLogger('run-notifiers');
const datastore = ObjectFactory.getDatastore();
const NTFY_SERVER = 'http://pihole.lan:8080/';

function shouldSendNotification(priceChange: PriceChange, userSubNotif: UserSubscriptionNotification): boolean {
    if (priceChange.prodId === userSubNotif.prodId &&
        priceChange.id! > userSubNotif.priceChangeId &&
        (priceChange.percentDiff <= -userSubNotif.notifyPriceDecreasePercent ||
            priceChange.percentDiff >= userSubNotif.notifyPriceIncreasePercent
        )
    ) {
        return true;
    }
    return false;
}

async function postNtfyService(moniker: string, notification: Notification): Promise<void> {
    const endpoint = `${NTFY_SERVER}${moniker}`;
    log(`Sending price change notification to ntfy service ${endpoint}`);
    await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(notification, null, 4)
    });
}

(async () => {
    while (true) {
        const latestPriceChanges = await datastore.getMostRecentPriceChanges();
        const changedProdIds = latestPriceChanges.map(_ => _.prodId);
        // Get for each changedProdId:
        //  * <user_id, prod_id, price_change_id> == for users subscribed to this product who have received at least one notification already for this prod_id
        //  * <user_id, prod_id, NULL> == for users subscribed to this product who have never a notification before
        const latestUserSubNotifs = await datastore.getMostRecentUserSubscriptionNotifications(changedProdIds);
        for (const pc of latestPriceChanges) {
            for (const usn of latestUserSubNotifs) {
                try {
                    if (shouldSendNotification(pc, usn)) {
                        log(`>>> Send notification to user ${usn.userId} priceChange ${pc.id} for product ${usn.prodId} of shop ${pc.shopId}`);
                        const notif: Notification = {
                            userId: usn.userId,
                            priceChangeId: pc.id!,
                            prodId: pc.prodId,
                            shopId: pc.shopId,
                        };
                        await postNtfyService(usn.moniker, notif);
                        await datastore.insertNotification(notif);
                    }
                } catch (err) {
                    logError(`Failed sending or saving notification`, err);
                }
            }
        }
        await sleep(5000);
    }
})()
    .catch(err => {
        logError(err); process.exit(1);
    });
