import fs from 'fs';
import { Browser, Builder, By, until, WebDriver } from 'selenium-webdriver';
import { Options } from 'selenium-webdriver/chrome';
import { PageLoadStrategy } from 'selenium-webdriver/lib/capabilities';
import { createLongNameId } from 'mnemonic-id';
import { CrawlerCtorParams, CrawlData, INVALID_PRICE_AMOUNT, CrawlProductPage, CURRENTLY_UNAVAILABLE_PRICE_AMOUNT } from './common/types';
import { getLogger, getErrorLogger, clearAllStorage, hideHeadlessness } from './common/utils';
import { webdriver as webdriverConfig } from '../config.json';
import { ObjectFactory } from './ObjectFactory';

const datastore = ObjectFactory.getDatastore();

/**
 * Common parent class of all crawler implementations. Does chromedriver setup & shutdown
 */
export class Crawler {
    private chromedriverOptions: Options = new Options();
    private driver: WebDriver | null;
    private loadCount: number = 0;
    private seleniumGet: Function = async () => this;
    // Exception: log functions are per crawler instance and not for entire module 
    // because we want them bound to each instance's uniq name 
    private readonly log;
    private readonly logError;
    private prodIdToCrawlPageMap: Map<number, CrawlProductPage>; // prodId => {prodUrl,priceXpath}
    readonly name: string;
    private readonly shopId: number;
    private readonly productCurrentlyUnavailableText: string;
    private readonly productCurrentlyUnavailableXpath: string;
    private readonly priceLocateRetries: number;
    private readonly priceCurrency: string;
    private readonly priceLocateTimeout: number;
    private priceRemoveChars: RegExp | string;
    private readonly priceThousandSeparator: string;
    private readonly priceDecimalSeparator: string;
    private readonly takeScreenshots: boolean;
    private readonly screenshotLocation: string;
    readonly discoveredData: CrawlData[] = [];

    constructor({
        crawlerParams,
        shopParams,
        webdriverParams,
    }: CrawlerCtorParams) {
        const finalDriverParams = Object.assign(webdriverConfig, webdriverParams);
        if (finalDriverParams.disableExtensions) {
            this.chromedriverOptions.addArguments('--disable-extensions');
        }
        if (finalDriverParams.incognito) {
            this.chromedriverOptions.addArguments('--incognito');
        }
        if (finalDriverParams.headless) {
            // See https://www.selenium.dev/blog/2023/headless-is-going-away/
            this.chromedriverOptions.addArguments('--headless=new');
        }
        if (finalDriverParams.proxyServerUrl) {
            this.chromedriverOptions.addArguments(`--proxy-server=${finalDriverParams.proxyServerUrl}`);
        }
        this.chromedriverOptions.addArguments('--disable-dev-shm-usage'); // The /dev/shm partition is too small in certain VM environments, causing Chrome to fail or crash
        this.chromedriverOptions.addArguments('--disable-gpu'); // Disables GPU hardware acceleration.
        this.chromedriverOptions.addArguments('--no-sandbox'); // Bypass OS security model
        // override headless mode's mention of "HeadlessChrome" in the UA
        this.chromedriverOptions.addArguments(`--user-agent=${finalDriverParams.userAgent}`);
        this.chromedriverOptions.addArguments('--window-size=1920,1080');
        // only wait until the initial HTML document has been parsed; discards loading of css, images, and subframes
        this.chromedriverOptions.setPageLoadStrategy(PageLoadStrategy.EAGER);

        this.name = `crawler--${createLongNameId()}`; // "CRLR-adj+adj+noun", 10^6 permutations
        this.shopId = shopParams.id!;
        this.productCurrentlyUnavailableXpath = shopParams.productCurrentlyUnavailableXpath;
        this.productCurrentlyUnavailableText = shopParams.productCurrentlyUnavailableText;
        this.priceLocateRetries = shopParams.priceLocateRetries;
        this.priceCurrency = shopParams.priceCurrency;
        this.priceLocateTimeout = shopParams.priceLocateTimeout;
        this.priceRemoveChars = shopParams.priceRemoveChars;
        this.priceThousandSeparator = shopParams.priceThousandSeparator;
        this.priceDecimalSeparator = shopParams.priceDecimalSeparator;
        this.driver = null; // created in init()
        this.log = getLogger(`Crawler:${this.name}`);
        this.logError = getErrorLogger(`Crawler:${this.name}`);
        this.prodIdToCrawlPageMap = new Map();
        this.takeScreenshots = crawlerParams.takeScreenshots; // for seeing what happened on errors in headless mode
        this.screenshotLocation = crawlerParams.screenshotLocation || '';
    }

    private async takeScreenshot(prodId: number): Promise<void> {
        // TODO: occassionally purge from disk the old screenshots
        if (this.takeScreenshots) {
            const screenshotFile = `${this.screenshotLocation}/selenium-screenshot-PRODID_${prodId}-${(new Date()).toISOString()}.png`;
            const imgData = await this.driver!.takeScreenshot();
            const base64Data = imgData.replace(/^data:image\/png;base64,/, "");
            fs.writeFileSync(screenshotFile, base64Data, 'base64');
            this.log(`Saved screenshot ${screenshotFile}`);
        }
    }

    // Will be called implicitly if uninitialized instance
    async init(): Promise<void> {
        const builder = await new Builder();
        builder.setChromeOptions(this.chromedriverOptions);
        this.driver = await builder.forBrowser(Browser.CHROME).build();
        this.loadCount = 0;
        this.log('Initializing Chromedriver...');
        // override Webdriver.get()
        this.seleniumGet = this.driver.get.bind(this.driver);
        const that = this;
        this.driver.get = async (url: string): Promise<void> => {
            await that.seleniumGet(url);
        };
        await hideHeadlessness(this.driver);
    }

    async shutdown(): Promise<void> {
        if (this.driver) {
            this.log(`Shutting down Chrome webdriver.`);
            await this.driver.quit();
            this.driver = null;
        }
    }

    addProductPage(params: { prodId: number, crawlPage: CrawlProductPage }): void {
        this.log(`Adding prodId ${params.prodId}`);
        this.prodIdToCrawlPageMap.set(params.prodId, params.crawlPage);
    }

    getAssignedProductPages(): Map<number, CrawlProductPage> {
        return this.prodIdToCrawlPageMap;
    }

    async crawlProductPages(): Promise<CrawlData[]> {
        if (!this.driver) {
            await this.init();
        }
        this.log(`Crawler assigned prodIds [${Array.from(this.prodIdToCrawlPageMap.keys())}]`);
        for (const [prodId, { url, priceXpath }] of this.prodIdToCrawlPageMap) {
            this.loadCount = 0;
            let discoveredValidPrice = false;
            while (this.loadCount <= this.priceLocateRetries) {
                this.loadCount++;
                this.log(`Crawler attempt #${this.loadCount}/${this.priceLocateRetries} locating prodiId ${prodId} price at ${url}...`);
                try {
                    await this.driver!.get(url);
                    await clearAllStorage(this.driver!); // cannot do this earlier; need a page loaded
                    await this.driver!.wait(until.elementLocated(By.xpath(priceXpath)), this.priceLocateTimeout);
                    const priceElem = await this.driver!.findElement(By.xpath(priceXpath));
                    try {
                        // Try making regex from string
                        this.priceRemoveChars = new RegExp(this.priceRemoveChars, 'g');
                    } catch (err) {
                        // Not RegExp; use as string
                    }
                    const amountStr = await priceElem.getText();
                    const amountStrNormalized = amountStr.replace(this.priceRemoveChars, '')
                        .replace(this.priceCurrency, '')
                        .replace(this.priceThousandSeparator, '')
                        .replace(this.priceDecimalSeparator, '.');
                    const amount = parseInt(amountStrNormalized, 10);
                    if (Number.isNaN(amount)) {
                        this.logError(`Crawler located price text "${amountStr}" and normalized to "${amountStrNormalized}" but parsed to NaN for prodId ${prodId}`);
                        await this.takeScreenshot(prodId);
                        break;
                    }
                    this.log(`Crawler located price ${amount} for prodId ${prodId} with xpath ${priceXpath}`);
                    await this.takeScreenshotIfPriceChanged(prodId, amount);
                    this.discoveredData.push({
                        crawlerName: this.name,
                        prodId,
                        shopId: this.shopId,
                        amount,
                    });
                    discoveredValidPrice = true;
                    break;
                } catch (err) {
                    this.logError(`Crawler failed attempt #${this.loadCount}/${this.priceLocateRetries} to locate price of prodId ${prodId}`, err);
                    await this.takeScreenshot(prodId);
                    this.logError(`Checking for "${this.productCurrentlyUnavailableText}" with xpath ${this.productCurrentlyUnavailableXpath}`);
                    try {
                        const currentlyUnavailableElem = await this.driver!.findElement(By.xpath(this.productCurrentlyUnavailableXpath));
                        const currentlyUnavailableElemText = await currentlyUnavailableElem.getText();
                        if (currentlyUnavailableElemText.match(new RegExp(this.productCurrentlyUnavailableText))) {
                            this.log(`Crawler located "${this.productCurrentlyUnavailableText}" for prodId ${prodId} using xpath ${this.productCurrentlyUnavailableXpath}`);
                            await this.takeScreenshotIfPriceChanged(prodId, CURRENTLY_UNAVAILABLE_PRICE_AMOUNT);
                            this.discoveredData.push({
                                crawlerName: this.name,
                                prodId,
                                shopId: this.shopId,
                                amount: CURRENTLY_UNAVAILABLE_PRICE_AMOUNT
                            });
                            // 0 for unavailability is a valid price on which we can build price_change record
                            discoveredValidPrice = true;
                            break;
                        }
                        this.logError(`Crawler found element but its text "${currentlyUnavailableElemText}" did not match "${this.productCurrentlyUnavailableText}"`);
                    } catch (err) {
                        this.logError(`Crawler did not find "${this.productCurrentlyUnavailableText}" element either.`, err);
                    }
                }
            }
            if (!discoveredValidPrice) {
                this.logError(`Crawler overall failed to locate price of prodId ${prodId} at "${url}"`);
                this.discoveredData.push({
                    crawlerName: this.name,
                    shopId: this.shopId,
                    prodId,
                    amount: INVALID_PRICE_AMOUNT
                });
            }
        }
        if (this.prodIdToCrawlPageMap.size === this.discoveredData.length) {
            this.log(`Crawler finished; discovered ${this.prodIdToCrawlPageMap.size}/${this.prodIdToCrawlPageMap.size} assigned prices!`);
        } else {
            this.logError(`Crawler finished; but only discovered ${this.discoveredData.length}/${this.prodIdToCrawlPageMap.size} prices!`)
        }
        await this.shutdown();
        return this.discoveredData;
    }

    private async takeScreenshotIfPriceChanged(prodId: number, amount: number): Promise<void> {
        if (this.takeScreenshot && (await datastore.getLastKnownPrice(prodId)) !== amount) {
            await this.takeScreenshot(prodId);
        }
    }
}
