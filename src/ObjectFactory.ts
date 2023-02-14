import { Datastore } from './Datastore';
import { Validator } from './Validator';
import config from '../config.json';
import { Notifier } from './Notifier';

class ObjectFactorySingleton {
    private static instance: ObjectFactorySingleton;
    private datastore: Datastore | undefined;
    private validator: Validator | undefined;
    private notifier: Notifier | undefined;

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

    getNotifier(): Notifier {
        if (!this.notifier) {
            this.notifier = new Notifier();
        }
        return this.notifier;
    }
}

export const ObjectFactory = ObjectFactorySingleton.Instance;
