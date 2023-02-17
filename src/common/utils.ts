import Debug from 'debug';
import { name, version } from '../../package.json';
import { WebDriver } from "selenium-webdriver";

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
    return Math.ceil((toAmount - fromAmount) * 100 / fromAmount);
}