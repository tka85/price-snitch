import { Browser, Builder, By, until, WebDriver } from 'selenium-webdriver';
import { Options } from 'selenium-webdriver/chrome';
import { PageLoadStrategy } from 'selenium-webdriver/lib/capabilities';
import { CrawlerParams, CrawlPageInput, CrawlPrice } from './common/types';
import { getLogger, getErrorLogger, clearAllStorage } from './common/utils';
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
        clearAllStorage(this.driver);
    }

    async shutdown(): Promise<void> {
        if (this.driver) {
            log('Shutting down Chrome webdriver and exiting.');
            await this.driver.quit();
            this.driver = null;
        }
    }

    async crawlProductPage({
        prodId,
        url,
        priceLocateRetries,
        priceXpath,
        priceLocateTimeout,
        priceRemoveChars,
        priceThousandSeparator,
        priceDecimalSeparator
    }: CrawlPageInput): Promise<CrawlPrice | undefined> {
        if (!this.driver) {
            await this.init();
        }
        this.loadCount = 0;
        while (this.loadCount < priceLocateRetries) {
            this.loadCount++;
            log(`Attempt #${this.loadCount}/${priceLocateRetries} to fetch price of ${url}...`);
            await this.driver!.get(url);
            try {
                await this.driver!.wait(until.elementLocated(By.xpath(priceXpath)), priceLocateTimeout);
                const priceElem = await this.driver!.findElement(By.xpath(priceXpath));
                try {
                    // Try making regex from string
                    priceRemoveChars = new RegExp(priceRemoveChars, 'g');
                } catch (err) {
                    // Not RegExp; use as string
                }
                const amountStr = await priceElem.getText();
                const amountStrNormalized = amountStr.replace(priceRemoveChars, '')
                    .replace(priceThousandSeparator, '')
                    .replace(priceDecimalSeparator, '.');
                const amount = parseInt(amountStrNormalized, 10);
                if (Number.isNaN(amount)) {
                    logError(`Located price text "${amountStr}" and normalized to "${amountStrNormalized}" but parsed to NaN for prod ${prodId}`);
                    break;
                }
                log(`Located price string "${amountStrNormalized}" parsed as number ${amount}`);
                return {
                    prodId,
                    amount,
                };
            } catch (err) {
                logError(`Failed attempt #${this.loadCount}/${priceLocateRetries} to locate price element`, err);
            }
        }
        logError(`Overall failure to locate price of prodId ${prodId} > URL ${url}`);
        await this.shutdown();
        return;
    }
}
