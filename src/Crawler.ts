import { Browser, Builder, By, until, WebDriver } from 'selenium-webdriver';
import { Options } from 'selenium-webdriver/chrome';
import { PageLoadStrategy } from 'selenium-webdriver/lib/capabilities';
import { createLongNameId } from 'mnemonic-id';
import { CrawlerParams, CrawlData, INVALID_PRICE_AMOUNT } from './common/types';
import { getLogger, getErrorLogger, clearAllStorage } from './common/utils';
import config from '../config.json';

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
    private prodIdUrlMap: Map<number, string>; // prodId => prodUrl
    readonly name: string;
    private readonly shopId: number;
    private readonly priceLocateRetries: number;
    private readonly priceXpath: string;
    private readonly priceLocateTimeout: number;
    private priceRemoveChars: RegExp | string;
    private readonly priceThousandSeparator: string;
    private readonly priceDecimalSeparator: string;
    readonly discoveredData: CrawlData[] = [];

    constructor({
        shopParams,
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

        this.name = createLongNameId(); // "adj+adj+noun", 10^6 permutations
        this.shopId = shopParams.id!;
        this.priceLocateRetries = shopParams.priceLocateRetries;
        this.priceXpath = shopParams.priceXpath;
        this.priceLocateTimeout = shopParams.priceLocateTimeout;
        this.priceRemoveChars = shopParams.priceRemoveChars;
        this.priceThousandSeparator = shopParams.priceThousandSeparator;
        this.priceDecimalSeparator = shopParams.priceDecimalSeparator;
        this.driver = null; // created in init()
        this.log = getLogger(`Crawler:${this.name}`);
        this.logError = getErrorLogger(`Crawler:${this.name}`);
        this.prodIdUrlMap = new Map();
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
        clearAllStorage(this.driver);
    }

    async shutdown(): Promise<void> {
        if (this.driver) {
            this.log(`Shutting down Chrome webdriver.`);
            await this.driver.quit();
            this.driver = null;
        }
    }

    addProductPage(params: {prodId: number, prodUrl: string}): void {
        this.log(`Adding prodId ${params.prodId}`);
        this.prodIdUrlMap.set(params.prodId, params.prodUrl);
    }

    getAssignedProductPages(): Map<number, string> {
        return this.prodIdUrlMap;
    }

    async crawlProductPages(): Promise<CrawlData[]> {
        if (!this.driver) {
            await this.init();
        }
        this.log(`Crawler assigned prodIds [${Array.from(this.prodIdUrlMap.keys())}]`);
        for (const [prodId, url] of this.prodIdUrlMap) {
            this.loadCount = 0;
            let discoveredValidPrice = false;
            while (this.loadCount <= this.priceLocateRetries) {
                this.loadCount++;
                this.log(`Crawler attempt #${this.loadCount}/${this.priceLocateRetries} locating prodiId ${prodId} price at ${url}...`);
                try {
                    await this.driver!.get(url);
                    await this.driver!.wait(until.elementLocated(By.xpath(this.priceXpath)), this.priceLocateTimeout);
                    const priceElem = await this.driver!.findElement(By.xpath(this.priceXpath));
                    try {
                        // Try making regex from string
                        this.priceRemoveChars = new RegExp(this.priceRemoveChars, 'g');
                    } catch (err) {
                        // Not RegExp; use as string
                    }
                    const amountStr = await priceElem.getText();
                    const amountStrNormalized = amountStr.replace(this.priceRemoveChars, '')
                        .replace(this.priceThousandSeparator, '')
                        .replace(this.priceDecimalSeparator, '.');
                    const amount = parseInt(amountStrNormalized, 10);
                    if (Number.isNaN(amount)) {
                        this.logError(`Crawler located price text "${amountStr}" and normalized to "${amountStrNormalized}" but parsed to NaN for prodId ${prodId}`);
                        break;
                    }
                    this.log(`Crawler located price string "${amountStrNormalized}" parsed as number ${amount}`);
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
        if (this.prodIdUrlMap.size === this.discoveredData.length) {
            this.log(`Crawler finished; discovered ${this.prodIdUrlMap.size}/${this.prodIdUrlMap.size} assigned prices!`);
        } else {
            this.logError(`Crawler finished; but only discovered ${this.discoveredData.length}/${this.prodIdUrlMap.size} prices!`)
        }
        await this.shutdown();
        return this.discoveredData;
    }
}
