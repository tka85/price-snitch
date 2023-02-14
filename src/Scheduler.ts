import parser from 'cron-parser';
import { ObjectFactory } from './ObjectFactory';
import { Datastore } from './Datastore';
import { getLogger, getErrorLogger } from './common/utils';

const CRONMAP_DATES_COUNT_UPPER_LIMIT = 10;
const CRONMAP_DATES_COUNT_LOWER_LIMIT = CRONMAP_DATES_COUNT_UPPER_LIMIT / 2;

const log = getLogger('Scheduler');
const logError = getErrorLogger('Scheduler');

export class Scheduler {
    // key == prod id, value == list of cron dates within next N hours from now
    private cronMap: Map<number, Date[]>;
    private datastore: Datastore;

    constructor() {
        // collect all product cron specifications; map<url,cron>
        this.cronMap = new Map();
        this.datastore = ObjectFactory.getDatastore();
    }

    async loadRuntimes(prodId: number): Promise<void> {
        const prod = await this.datastore.getProductById(prodId);
        const cronDates: Date[] = this.cronMap.get(prodId) || [];
        const parserOptions = {
            currentDate: cronDates.length ? new Date(cronDates[cronDates.length - 1]) : new Date(),
        };
        try {
            let interval = parser.parseExpression(prod.cron, parserOptions);
            while (cronDates.length < CRONMAP_DATES_COUNT_UPPER_LIMIT) {
                cronDates.push(new Date(interval.next().toISOString()));
            }
            log(`Finished filling ${cronDates.length} runtimes for prod ${prod.id!} ("${prod.descr ?? prod.url}")`, cronDates);
        } catch (err) {
            logError(err);
        }
        this.cronMap.set(prod.id!, cronDates);
    }

    async checkCronmapRefills(): Promise<void> {
        for (const [prodId, cronDates] of this.cronMap) {
            if (cronDates.length <= CRONMAP_DATES_COUNT_LOWER_LIMIT) {
                log(`Prod ${prodId} running low with ${cronDates.length} remaining future runtimes; refilling...`, cronDates);
                await this.loadRuntimes(prodId);
            }
        }
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
        log('Mature prod ids', matureProdIds);
        return Array.from(matureProdIds);
    }
}