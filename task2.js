import puppeteer from "puppeteer";
import fs from "fs";
import { OUTPUT_FILE, SELECTORS } from "./constants.js";

const getProducts = async () => {
  try {
    // Start a Puppeteer session
    const browser = await puppeteer.launch({
      headless: true,
    });

    const page = await browser.newPage();

    // Block unnecessary resources
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const resourceType = req.resourceType();
      if (["image", "stylesheet", "font"].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    //Wait for css class [letter-block] to load
    await page.goto(
      "https://web.archive.org/web/20250119070347/https://www.microfocus.com/en-us/products?trial=true&ref=ddm",
      {
        waitUntil: "domcontentloaded",
      }
    );
    await page.waitForSelector(SELECTORS.CLS_LETTER_BLOCK, { timeout: 10000 });

    // Extract products
    const products = await page.evaluate((selectors) => {
      const {
        NOT_AVAILABLE,
        CLS_LETTER_BLOCK,
        CLS_EACH_LETTER,
        CLS_CARD,
        CLS_CARD_FOOTER,
        CLS_CARD_TITLE,
        CLS_CARD_DESC,
        CLS_CTA_SECTION,
        HREF_SUPPORT,
        HREF_COMMUNITY,
        TXT_FREE_TRIAL,
        TYPE_FREE_TRIAL,
        TXT_DEMO,
        TYPE_DEMO,
      } = selectors;

      const extractAll = (element, selector, callback) =>
        Array.from(element?.querySelectorAll(selector) || []).map(callback);

      const extractText = (element, selector) =>
        element?.querySelector(selector)?.innerText.trim() || NOT_AVAILABLE;

      const extractLink = (element, selector) =>
        element?.querySelector(selector)?.href || NOT_AVAILABLE;

      return Array.from(document.querySelectorAll(CLS_LETTER_BLOCK)).flatMap(
        (block) => {
          const startingLetter = extractText(block, CLS_EACH_LETTER);

          // Select all product cards inside this letter block
          return Array.from(block.querySelectorAll(CLS_CARD)).map((card) => {
            const footer = card.querySelector(CLS_CARD_FOOTER);

            const productFooterLinks = {
              "Support Login": extractLink(footer, HREF_SUPPORT),
              Community: extractLink(footer, HREF_COMMUNITY),
            };

            return {
              "Starting Letter": startingLetter,
              "Product Name": extractText(card, CLS_CARD_TITLE),
              Description: extractText(card, CLS_CARD_DESC),
              "Free Trial / Demo Request URL": extractAll(
                card,
                CLS_CTA_SECTION,
                (cta) => {
                  const text = cta.innerText.trim();
                  return {
                    type: text.toLowerCase().includes(TXT_FREE_TRIAL)
                      ? TYPE_FREE_TRIAL
                      : text.toLowerCase().includes(TXT_DEMO)
                      ? TYPE_DEMO
                      : "Other",
                    url: cta.href || NOT_AVAILABLE,
                  };
                }
              ),
              ...productFooterLinks,
            };
          });
        }
      );
    }, SELECTORS);

    console.log(products);

    const finalProdInfo = {
      length: products.length,
      products,
    };

    // Save the products data to a JSON file
    await fs.promises.writeFile(
      OUTPUT_FILE,
      JSON.stringify(finalProdInfo, null, 4)
    );
    console.log(`Products have been saved to ${OUTPUT_FILE}`);
    await browser.close();
  } catch (error) {
    console.error("Error:", error);
  }
};

// Start the scraping
getProducts();
