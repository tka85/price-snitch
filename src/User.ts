// import { getLogger, getErrorLogger} from './common/utils';

// const log = getLogger('User');
// const logError = getErrorLogger('User');

export class User {
    readonly moniker;

    constructor(moniker: string) {
        this.moniker = moniker;
    }
}
