import { Browser, Builder, By, until, WebDriver } from 'selenium-webdriver';
import { Options } from 'selenium-webdriver/chrome';
import { PageLoadStrategy } from 'selenium-webdriver/lib/capabilities';
import { CrawlerParams, Price, Product } from './common/types';
import { getLogger, getErrorLogger } from './common/utils';
import config from '../config.json';

const log = getLogger('Crawler');
const logError = getErrorLogger('Crawler');

/**
 * Common parent class of all crawler implementations. Does chromedriver setup & shutdown
 */
export class Crawler {
    private chromedriverOptions: Options = new Options();
    private driver: WebDriver | null;
    private loadCount: number = 0;
    private seleniumGet: Function = async () => this;

    constructor({
        webdriverParams,
    }: CrawlerParams) {
        const finalDriverParams = Object.assign(config.webdriver, webdriverParams);
        if (finalDriverParams.disableExtensions) {
            this.chromedriverOptions.addArguments('--disable-extensions');
        }
        if (finalDriverParams.incognito) {
            this.chromedriverOptions.addArguments('incognito');
        }
        if (finalDriverParams.headless) {
            this.chromedriverOptions.addArguments('headless');
        }
        if (finalDriverParams.proxyServerUrl) {
            this.chromedriverOptions.addArguments(`--proxy-server=${finalDriverParams.proxyServerUrl}`);
        }
        this.chromedriverOptions.addArguments('--disable-dev-shm-usage');
        this.chromedriverOptions.addArguments('--no-sandbox'); // Bypass OS security model
        // only wait until the initial HTML document has been parsed; discards loading of css, images, and subframes
        this.chromedriverOptions.setPageLoadStrategy(PageLoadStrategy.EAGER);
        // this.chromedriverOptions.setPageLoadStrategy(PageLoadStrategy.NONE);

        this.driver = null; // created in init()
    }

    // Will be called implicitly if uninitialized instance
    async init(): Promise<void> {
        const builder = await new Builder();
        builder.setChromeOptions(this.chromedriverOptions);
        this.driver = await builder.forBrowser(Browser.CHROME).build();
        this.loadCount = 0;
        log('Initializing Chromedriver...');
        // override Webdriver.get()
        this.seleniumGet = this.driver.get.bind(this.driver);
        const that = this;
        this.driver.get = async (url: string): Promise<void> => {
            await that.seleniumGet(url);
        };
    }

    async shutdown(): Promise<void> {
        if (this.driver) {
            log('Shutting down Chrome webdriver and exiting.');
            await this.driver.quit();
            this.driver = null;
        }
    }

    async scanProduct(product: Product): Promise<Price | undefined> {
        if (!this.driver) {
            await this.init();
        }
        while (this.loadCount < product.priceLocateRetries) {
            this.loadCount++;
            log(`Attempt #${this.loadCount}/${product.priceLocateRetries} to fetch price of ${product.url}...`);
            await this.driver!.get(product.url);
            try {
                await this.driver!.wait(until.elementLocated(By.xpath(product.priceElementLocator)), product.priceLocateTimeout);
                const priceElem = await this.driver!.findElement(By.xpath(product.priceElementLocator));
                try {
                    // Try making regex from string
                    product.priceRemoveChars = new RegExp(product.priceRemoveChars, 'g');
                } catch (err) {
                    // Not RegExp; use as string
                }
                let amount = (await priceElem.getText()).replace(product.priceRemoveChars, '');
                return {
                    amount,
                    prodId: product.id!,
                    created: new Date().toISOString(),
                };
            } catch (err) {
                logError(`Failed attempt #${this.loadCount}/${product.priceLocateRetries} to locate price element`);
            }
        }
        logError(`Failed overall to locate price of ${product.url}`);
        await this.shutdown();
        return;
    }
}
