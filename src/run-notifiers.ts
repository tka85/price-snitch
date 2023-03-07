import { ntfy as ntfyConfig } from '../config.json';
import fetch from 'node-fetch';
import { Notification, PriceChange, UserSubscriptionNotification } from './common/types';
import { getErrorLogger, getLogger, sleep } from './common/utils';
import { ObjectFactory } from './ObjectFactory';

const log = getLogger('run-notifiers');
const logError = getErrorLogger('run-notifiers');
const datastore = ObjectFactory.getDatastore();

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
    const endpoint = `${ntfyConfig.server}/${moniker}`;
    log(`Sending to "${endpoint}" notification:\n`, JSON.stringify(notification, null, 4));
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
                if (shouldSendNotification(pc, usn)) {
                    let notif: Notification = {
                        userId: usn.userId,
                        priceChangeId: pc.id!,
                        prodId: pc.prodId,
                        shopId: pc.shopId,
                    };
                    try {
                        await postNtfyService(usn.moniker, notif);
                    } catch (err) {
                        logError(`Failed sending or saving notification`, err);
                        notif.sendError = JSON.stringify(err);
                    } finally {
                        await datastore.insertNotification(notif);
                    }
                }
            }
        }
        await sleep(5000);
    }
})()
    .catch(err => {
        logError(err); process.exit(1);
    });
