import parser from 'cron-parser';
import { ObjectFactory } from './ObjectFactory';
import { Datastore } from './Datastore';
import { IteratorResultOrCronDate } from 'cron-parser/types/common';
import { getLogger, getErrorLogger } from './common/utils';

const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000; // 24h in ms
const log = getLogger('Scheduler');
const logError = getErrorLogger('Scheduler');

export class Scheduler {
    // key == prod id, value == list of cron dates within next 24h from now
    private cronMap: Map<number, Date[]>;
    private datastore: Datastore;
    private parserOptions = {
        startDate: new Date(),
        endDate: new Date(new Date().getTime() + ONE_DAY_IN_MS),
        iterator: true
    };

    constructor() {
        // collect all product cron specifications; map<url,cron>
        this.cronMap = new Map();
        this.datastore = ObjectFactory.getDatastore();
    }

    async loadCron(prodId: number): Promise<void> {
        log(`Adding crons for prod ${prodId}`);
        const prod = await this.datastore.getProductById(prodId);
        const cronDates: Date[] = [];
        try {
            let interval = parser.parseExpression(prod.cron, this.parserOptions);
            let obj = <IteratorResultOrCronDate<true>>interval.next();
            while (!obj.done) {
                cronDates.push(obj.value.toDate());
                obj = <IteratorResultOrCronDate<true>>interval.next();
            }
            log(`Finished loading ${cronDates.length} cron entries for prod ${prod.id!} ("${prod.descr ?? prod.url}")`, cronDates);
        } catch (err) {
            logError(err);
        }
        this.cronMap.set(prod.id!, cronDates);
    }

    printAllCrons(): void {
        log('Printing scheduler crons', this.cronMap);
    }

    getMatureProdIds(): number[] {
        const now = new Date();
        const matureProdIds = new Set<number>();
        for (const [prodId, cronDates] of this.cronMap) {
            while (cronDates[0] <= now) {
                matureProdIds.add(prodId);
                cronDates.shift();
            }
        }
        return Array.from(matureProdIds);
    }
}