import puppeteer from "puppeteer";
import fs from "fs";

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
    await page.goto("https://www.microfocus.com/en-us/products?trial=true", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForSelector(".letter-block", { timeout: 10000 });

    // Extract products
    const products = await page.evaluate(() => {
      const extractAll = (element, selector, callback) =>
        Array.from(element?.querySelectorAll(selector) || []).map(callback);

      const extractText = (element, selector) =>
        element?.querySelector(selector)?.innerText.trim() || "N/A";

      const extractLink = (element, selector) =>
        element?.querySelector(selector)?.href || "N/A";

      return Array.from(document.querySelectorAll(".letter-block")).flatMap(
        (block) => {
          const startingLetter = extractText(block, ".each-letter");

          // Select all product cards inside this letter block
          return Array.from(block.querySelectorAll(".uk-card")).map((card) => {
            const footer = card.querySelector(".footer");

            const productFooterLinks = {
              "Support Login": extractLink(footer, 'a[href*="support"]'),
              Community: extractLink(footer, 'a[href*="community"]'),
            };

            return {
              "Starting Letter": startingLetter,
              "Product Name": extractText(card, ".title h3 a, .title h3 span"),
              Description: extractText(card, ".description p"),
              "Free Trial / Demo Request URL": extractAll(
                card,
                ".cta-section a",
                (cta) => {
                  const text = cta.innerText.trim();
                  return {
                    type: text.toLowerCase().includes("free trial")
                      ? "Free Trial"
                      : text.toLowerCase().includes("demo")
                      ? "Demo"
                      : "Other",
                    url: cta.href || "N/A",
                  };
                }
              ),
              ...productFooterLinks,
            };
          });
        }
      );
    });

    console.log(products);

    const finalProdInfo = {
      length: products.length,
      products,
    };

    // Save the products data to a JSON file
    const outputFile = "products.json";
    await fs.promises.writeFile(
      outputFile,
      JSON.stringify(finalProdInfo, null, 4)
    );
    console.log(`Products have been saved to ${outputFile}`);
    await browser.close();
  } catch (error) {
    console.error("Error:", error);
  }
};

// Start the scraping
getProducts();
