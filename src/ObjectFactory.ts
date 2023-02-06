import { Datastore } from './Datastore';
import { Validator } from './Validator';
import config from '../config.json';

class ObjectFactorySingleton {
    private static instance: ObjectFactorySingleton;
    private datastore: Datastore | undefined;
    private validator: Validator | undefined;

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

    getValidator(): Validator {
        if (!this.validator) {
            this.validator = new Validator();
        }
        return this.validator;
    }
}

export const ObjectFactory = ObjectFactorySingleton.Instance;
