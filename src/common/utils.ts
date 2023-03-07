import Debug from 'debug';
import { name, version } from '../../package.json';
import { WebDriver } from "selenium-webdriver";

const log = getLogger('utils');
// const logError = getErrorLogger('utils');

// Fisher-Yates; in-place shuffling
export function shuffleArray(array): void {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

export async function sleep(ms: number): Promise<void> {
    log(`Sleeping ${ms / 1000}s...`);
    return await new Promise((res) => setTimeout(res, ms));
}

// Does not require a page to have been loaded first
// TODO: check these occasionally against https://intoli.com/blog/making-chrome-headless-undetectable/chrome-headless-test.html
export async function hideHeadlessness(driver: WebDriver) {
    await driver.executeScript(`
    // Overwrite the 'languages' property to use a custom getter
    Object.defineProperty(window.navigator, 'languages', {
        get: function() {
            return ['en-US', 'en', 'de-DE', 'de'];
        },
    });

    // Overwrite the 'plugins' property to use a custom getter
    Object.defineProperty(navigator, 'plugins', {
        get: function() {
            // this just needs to have 'length > 0', but we could mock the plugins too
            return [1, 2, 3, 4, 5, 6, 7];
        },
    });
    
    // Custom getter for the Broken Image height & width dimensions so it doesn't show up empty or 0x0
    // ['height', 'width'].forEach(dimension => {
    //     // store the existing descriptor
    //     const imageDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, dimension);
    //     // redefine the dimension with a patched descriptor
    //     Object.defineProperty(HTMLImageElement.prototype, dimension, {
    //         ...imageDescriptor,
    //         get: function() {
    //             // return an arbitrary non-zero dimension if the image failed to load
    //             if (this.complete && this.naturalHeight == 0) {
    //                 return 20;
    //             }
    //             // otherwise, return the actual dimension
    //             return imageDescriptor.get.apply(this);
    //         },
    //     });
    // });
    `);
}

// This requires a page to have been loaded first
export async function clearAllStorage(driver: WebDriver): Promise<void> {
    await driver.executeScript(`
    window.localStorage.clear();
    window.sessionStorage.clear();
    var cookies = document.cookie.split("; ");
    for (var c = 0; c < cookies.length; c++) {
        var d = window.location.hostname.split(".");
        while (d.length > 0) {
            var cookieBase = encodeURIComponent(cookies[c].split(";")[0].split("=")[0]) + '=; expires=Thu, 01-Jan-1970 00:00:01 GMT; domain=' + d.join('.') + ' ;path=';
            var p = location.pathname.split('/');
            document.cookie = cookieBase + '/';
            while (p.length > 0) {
                document.cookie = cookieBase + p.join('/');
                p.pop();
            };
            d.shift();
        }
    }`);
}

export function getLogger(module: string): Function {
    return Debug(`${name}:${version}:${module}`);
}

export function getErrorLogger(module: string): Function {
    return Debug(`${name}:${version}:${module}:ERROR`);
}

export function evalPercentDiff(fromAmount: number, toAmount: number): number {
    if (fromAmount === 0) {
        // Means from "Currently unavailable" it now became available again therefore
        // we return 100% so it triggers a notification regardless of notification 
        // increase % thresholds
        return 100;
    }
    // The normal case but also the case when product becomes "Currently unavailable" 
    // where we return -100% so it triggers a notification regardless of notification
    // decrease % thresholds
    return Math.ceil((toAmount - fromAmount) * 100 / fromAmount);
}