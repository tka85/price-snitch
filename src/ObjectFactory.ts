import { Datastore } from './Datastore';
import config from '../config.json';

class ObjectFactorySingleton {
    private static instance: ObjectFactorySingleton;
    private datastore: Datastore | undefined;

    // Getter for OF singleton itself
    static get Instance(): ObjectFactorySingleton {
        if (!this.instance) {
            this.instance = new this();
        }
        return this.instance;
    }

    getDatastore(): Datastore {
        if (!this.datastore) {
            this.datastore = new Datastore({
                filename: config.db
            });
        }
        return this.datastore;
    }
}

export const ObjectFactory = ObjectFactorySingleton.Instance;
