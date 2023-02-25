import Debug from 'debug';
import { name, version } from '../../package.json';
import { WebDriver } from "selenium-webdriver";

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
    return await new Promise((res) => setTimeout(res, ms));
}

export function clearAllStorage(driver: WebDriver): void {
    driver.executeScript(`
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
