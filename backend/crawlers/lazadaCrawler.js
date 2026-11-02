const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const cheerio = require("cheerio");

async function crawlLazada(keyword, limit = 20) {
    let driver;

    try {
        driver = await new Builder()
            .forBrowser("chrome")
            .setChromeOptions(
                new chrome.Options()
            )
            .build();

        const url =
            "https://www.lazada.vn/catalog/?q=" +
            encodeURIComponent(keyword);

        console.log(`Lazada: ${url}`);

        await driver.get(url);

        await driver.wait(
            until.elementLocated(
                By.css("body")
            ),
            10000
        );

        await driver.sleep(3000);

        const html =
            await driver.getPageSource();

        const $ = cheerio.load(html);

        const products = [];

        $("a").each((index, element) => {

            if (products.length >= limit) {
                return false;
            }

            const href =
                $(element).attr("href");

            const text =
                $(element)
                    .text()
                    .replace(/\s+/g, " ")
                    .trim();

            if (
                !href ||
                !text ||
                text.length < 5
            ) {
                return;
            }

            if (
                href.includes("/products/")
            ) {

                const product = {

                    source: "lazada",

                    source_product_id:
                        href,

                    name: text,

                    price: null,

                    currency: "VND",

                    image: null,

                    url:
                        href.startsWith("http")
                            ? href
                            : "https:" + href,

                    shop: null,

                    rating: null,

                    sold: null,

                    category: null,

                    search_keyword: keyword
                };

                products.push(product);
            }
        });

        console.log(
            `Lazada found: ${products.length}`
        );

        return products;

    } catch (error) {

        console.error(
            "Lazada crawler error:",
            error.message
        );

        return [];

    } finally {

        if (driver) {
            await driver.quit();
        }
    }
}

module.exports = crawlLazada;