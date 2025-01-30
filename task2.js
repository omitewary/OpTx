import puppeteer from "puppeteer";
import fs from "fs";
import { OUTPUT_FILE, SELECTORS } from "./constants2.js";

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
    await page.goto(SELECTORS.URL, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForSelector(SELECTORS.KEY_SELECTOR, { timeout: 10000 });

    // Extract products
    const products = await page.evaluate((selectors) => {
      const {
        NOT_AVAILABLE,
        CONTAINER,
        STARTING_LETTER,
        PRODUCT_CONTAINER,
        CONTAINER_FOOTER,
        PRODUCT_TITLE,
        PRODUCT_DESC,
        PRODUCT_LINK,
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

      return Array.from(document.querySelectorAll(CONTAINER)).flatMap(
        (block) => {
          const startingLetter = extractText(block, STARTING_LETTER);

          // Select all product cards inside this letter block
          return Array.from(block.querySelectorAll(PRODUCT_CONTAINER)).map(
            (card) => {
              const footer = card.querySelector(CONTAINER_FOOTER);

              const productFooterLinks = {
                "Support Login": extractLink(footer, HREF_SUPPORT),
                Community: extractLink(footer, HREF_COMMUNITY),
              };

              return {
                "Starting Letter": startingLetter,
                "Product Name": extractText(card, PRODUCT_TITLE),
                Description: extractText(card, PRODUCT_DESC),
                "Free Trial / Demo Request URL": extractAll(
                  card,
                  PRODUCT_LINK,
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
            }
          );
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
