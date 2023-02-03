import Debug from 'debug';
import { name } from '../package.json';
import { Browser, Builder, By, until, WebDriver } from 'selenium-webdriver';
import { Options } from 'selenium-webdriver/chrome';
import { PageLoadStrategy } from 'selenium-webdriver/lib/capabilities';
import { Datastore } from './Datastore';
import { CrawlerParams, Product } from './common/types';
import config from '../config.json';

const debug = Debug(`${name}:Crawler`);
const error = Debug(`${name}:Crawler:error`);

/**
 * Common parent class of all crawler implementations. Does chromedriver setup, load count accounting, shutdown etc.
 */
export class Crawler {
    private chromedriverOptions: Options = new Options();
    private datastore: Datastore;
    private driver: WebDriver | null;
    private seleniumGet: Function = async () => this;
    private currentLoadCount: number;

    constructor({
        datastore,
        webdriverParams,
    }: CrawlerParams) {
        this.datastore = datastore;
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

        this.currentLoadCount = 0;
    }

    // Will be called implicitly if uninitialized instance
    async init(): Promise<void> {
        const builder = await new Builder();
        builder.setChromeOptions(this.chromedriverOptions);
        this.driver = await builder.forBrowser(Browser.CHROME).build();
        // override Webdriver.get()
        this.seleniumGet = this.driver.get.bind(this.driver);
        const that = this;
        this.driver.get = async (url: string): Promise<void> => {
            await that.seleniumGet(url);
        };
    }

    async shutdown(): Promise<void> {
        debug('Shutting down Chrome webdriver and exiting.');
        await this.driver!.quit();
        process.exit(0);
    }

    async scanProduct(product: Product): Promise<void> {
        await this.datastore.insertProduct(product);
        if (!this.driver) {
            await this.init();
        }

        await this.driver!.get(product.url);

        try {
            await this.driver!.wait(until.elementLocated(By.xpath(product.priceElementLocator)), product.priceLocateTimeout);
            const priceElem = await this.driver!.findElement(By.xpath(product.priceElementLocator));
            const price = (await priceElem.getText()).replace(product.priceRemoveCharsRegex, '');
            console.log(`>>> Found price`, price);
        } catch (err) {
            error(`Could not locate element with "${product.priceElementLocator}" (time out ${product.priceLocateTimeout}ms)`);
        } finally {
            // Process final loaded data
        }
    }
}
