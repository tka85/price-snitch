import { Browser, Builder, By, until, WebDriver } from 'selenium-webdriver';
import { Options } from 'selenium-webdriver/chrome';
import { PageLoadStrategy } from 'selenium-webdriver/lib/capabilities';
import { createLongNameId } from 'mnemonic-id';
import { CrawlerParams, CrawlPagesInput, CrawlData, INVALID_PRICE_AMOUNT } from './common/types';
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
    readonly name: string;
    readonly discoveredData: CrawlData[] = [];

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

        this.name = createLongNameId(); // adj+adj+noun
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
            log(`Crawler "${this.name}" shutting down Chrome webdriver.`);
            await this.driver.quit();
            this.driver = null;
        }
    }

    async crawlProductPages({
        prodIdUrlMap,
        priceLocateRetries,
        priceXpath,
        priceLocateTimeout,
        priceRemoveChars,
        priceThousandSeparator,
        priceDecimalSeparator
    }: CrawlPagesInput): Promise<CrawlData[]> {
        if (!this.driver) {
            await this.init();
        }
        log(`Product crawler "${this.name}" assigned prodIds [${Array.from(prodIdUrlMap.keys())}]`);
        for (const [prodId, url] of prodIdUrlMap) {
            this.loadCount = 0;
            let discoveredValidPrice = false;
            while (this.loadCount <= priceLocateRetries) {
                this.loadCount++;
                log(`Product crawler "${this.name}" attempt #${this.loadCount}/${priceLocateRetries} locating prodiId ${prodId} price at ${url}...`);
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
                        logError(`Product crawler "${this.name}" located price text "${amountStr}" and normalized to "${amountStrNormalized}" but parsed to NaN for prod ${prodId}`);
                        break;
                    }
                    log(`Product crawler "${this.name}" located price string "${amountStrNormalized}" parsed as number ${amount}`);
                    this.discoveredData.push({
                        prodId,
                        amount,
                    });
                    discoveredValidPrice = true;
                    break;
                } catch (err) {
                    logError(`Product crawler "${this.name}" failed attempt #${this.loadCount}/${priceLocateRetries} to locate price of prodId ${prodId}`, err);
                }
            }
            if (!discoveredValidPrice) {
                logError(`Product crawler "${this.name}" overall failed to locate price of prodId ${prodId} at "${url}"`);
                this.discoveredData.push({
                    prodId,
                    amount: INVALID_PRICE_AMOUNT
                });
            }
        }
        if (prodIdUrlMap.size === this.discoveredData.length) {
            log(`Product crawler "${this.name}" finished; discovered ${prodIdUrlMap.size}/${prodIdUrlMap.size} assigned prices!`);
        } else {
            logError(`Product crawler "${this.name}" finished; but only discovered ${this.discoveredData.length}/${prodIdUrlMap.size} prices!`)
        }
        await this.shutdown();
        return this.discoveredData;
    }
}
