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
      const footer = document.querySelector("#skip-footer");
      const footerLinks = {
        "Support Login":
          footer.querySelector("a[href*='support']")?.href || "N/A",
        Community: footer.querySelector("a[href*='community']")?.href || "N/A",
      };

      return Array.from(
        document.querySelectorAll(".letter-block"),
        (block) => ({
          "Starting Letter":
            block.querySelector(".each-letter")?.innerText.trim() || "N/A",
          "Product Name":
            block.querySelector(".title")?.innerText.trim() || "N/A",
          "Description":
            block.querySelector(".description")?.innerText.trim() || "N/A",
          "Free Trial / Demo Request URL":
            block.querySelector(".cta-section a")?.href || "N/A",
          ...footerLinks,
        })
      );
    });

    console.log("Products: ", products);

    await browser.close();

    // Save the products data to a JSON file
    const outputFile = "products.json";
    fs.writeFileSync(outputFile, JSON.stringify(products, null, 4));

    console.log(`Products have been saved to ${outputFile}`);
  } catch (error) {
    console.error("Error:", error);
  }
};

// Start the scraping
getProducts();
