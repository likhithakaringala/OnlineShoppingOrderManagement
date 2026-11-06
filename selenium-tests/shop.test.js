
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
let counter = 0;

// Wait until an element contains the expected text
async function waitForText(driver, locator, expectedText) {
  await driver.wait(async () => {
    try {
      const element = await driver.findElement(locator);
      const actualText = await element.getText();

      return actualText.toLowerCase().includes(
        expectedText.toLowerCase()
      );
    } catch {
      return false;
    }
  }, 10000);
}

// Wait until an element is available and clickable
async function waitForClickable(driver, locator) {
  await driver.wait(async () => {
    try {
      const element = await driver.findElement(locator);
      return await element.isDisplayed() && await element.isEnabled();
    } catch {
      return false;
    }
  }, 10000);
}

// Open Chrome browser
async function browser() {
  const options = new chrome.Options().addArguments(
    "--headless=new",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--window-size=1400,1000"
  );

  const driver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .build();

  await driver.get(BASE_URL);
  return driver;
}

// Register a new customer
async function registerCustomer(driver) {
  const stamp = `${Date.now()}${++counter}`;

  await driver.wait(
    until.elementLocated(
      By.css("#register-form input[name='name']")
    ),
    10000
  );

  await driver.findElement(
    By.css("#register-form input[name='name']")
  ).sendKeys("Test Customer");

  await driver.findElement(
    By.css("#register-form input[name='email']")
  ).sendKeys(`test${stamp}@example.com`);

  await driver.findElement(
    By.css("#register-form input[name='password']")
  ).sendKeys("testpass123");

  await driver.findElement(
    By.css("#register-form button")
  ).click();

  await waitForText(
    driver,
    By.id("user-label"),
    "Test Customer"
  );
}

// Add the first product
async function addFirstProduct(driver) {
  await driver.findElement(By.id("search")).clear();

  await driver.findElement(By.id("search"))
    .sendKeys("Wireless Mouse");

  const addButton = By.css("[data-add]");

  await driver.wait(
    until.elementLocated(addButton),
    10000
  );

  await waitForClickable(driver, addButton);

  // Locate the button again immediately before clicking
  await driver.findElement(addButton).click();

  await waitForText(
    driver,
    By.id("notice"),
    "added"
  );
}

// Close Chrome browser
async function close(driver) {
  if (driver) {
    await driver.quit();
  }
}

// TC01 - Customer login
test("TC01 - Customer login", async () => {
  const driver = await browser();

  try {
    await driver.findElement(
      By.css("#login-form input[name='email']")
    ).sendKeys("admin@shop.com");

    await driver.findElement(
      By.css("#login-form input[name='password']")
    ).sendKeys("admin123");

    await driver.findElement(
      By.css("#login-form button")
    ).click();

    await waitForText(
      driver,
      By.id("user-label"),
      "Store Admin"
    );

    assert.match(
      await driver.findElement(By.id("user-label")).getText(),
      /Store Admin/
    );
  } finally {
    await close(driver);
  }
});

// TC02 - Search product
test("TC02 - Search product", async () => {
  const driver = await browser();

  try {
    await driver.findElement(By.id("search"))
      .sendKeys("Wireless Mouse");

    await driver.wait(
      until.elementLocated(By.css(".product h3")),
      10000
    );

    assert.equal(
      await driver.findElement(By.css(".product h3")).getText(),
      "Wireless Mouse"
    );
  } finally {
    await close(driver);
  }
});

// TC03 - Add product to cart
test("TC03 - Add product to cart", async () => {
  const driver = await browser();

  try {
    await registerCustomer(driver);
    await addFirstProduct(driver);

    await driver.findElement(
      By.css("[data-view='cart']")
    ).click();

    await driver.wait(
      until.elementLocated(By.css(".cart-row")),
      10000
    );

    assert.match(
      await driver.findElement(By.id("cart-items")).getText(),
      /Wireless Mouse/
    );
  } finally {
    await close(driver);
  }
});

// TC04 - Update cart quantity

test("TC04 - Update cart quantity", async () => {
  const driver = await browser();

  try {
    await registerCustomer(driver);
    await addFirstProduct(driver);

    await driver.findElement(
      By.css("[data-view='cart']")
    ).click();

    const quantityLocator = By.css("[data-qty]");

    await driver.wait(
      until.elementLocated(quantityLocator),
      10000
    );

    // Update quantity using JavaScript to avoid stale elements
    await driver.executeScript(() => {
      const input = document.querySelector("[data-qty]");

      if (!input) {
        throw new Error("Quantity input not found");
      }

      input.value = "2";

      input.dispatchEvent(
        new Event("change", { bubbles: true })
      );
    });

    await waitForText(
      driver,
      By.id("notice"),
      "updated"
    );

    await driver.wait(async () => {
      try {
        const input = await driver.findElement(quantityLocator);
        return await input.getAttribute("value") === "2";
      } catch {
        return false;
      }
    }, 10000);

    assert.equal(
      await driver.findElement(quantityLocator)
        .getAttribute("value"),
      "2"
    );

  } finally {
    await close(driver);
  }
});

// TC05 - Remove product from cart
test("TC05 - Remove product from cart", async () => {
  const driver = await browser();

  try {
    await registerCustomer(driver);
    await addFirstProduct(driver);

    await driver.findElement(
      By.css("[data-view='cart']")
    ).click();

    const removeButton = By.css("[data-remove]");

    await driver.wait(
      until.elementLocated(removeButton),
      10000
    );

    await waitForClickable(driver, removeButton);
    await driver.findElement(removeButton).click();

    await waitForText(
      driver,
      By.id("cart-items"),
      "empty"
    );

    assert.match(
      await driver.findElement(By.id("cart-items")).getText(),
      /empty/i
    );
  } finally {
    await close(driver);
  }
});

// TC06 - Checkout
test("TC06 - Checkout", async () => {
  const driver = await browser();

  try {
    await registerCustomer(driver);
    await addFirstProduct(driver);

    await driver.findElement(
      By.css("[data-view='cart']")
    ).click();

    await driver.wait(
      until.elementLocated(By.id("checkout-btn")),
      10000
    );

    await driver.findElement(
      By.id("checkout-btn")
    ).click();

    await waitForText(
      driver,
      By.id("notice"),
      "placed successfully"
    );

    assert.match(
      await driver.findElement(By.id("notice")).getText(),
      /placed successfully/
    );
  } finally {
    await close(driver);
  }
});

// TC07 - View order history
test("TC07 - View order history", async () => {
  const driver = await browser();

  try {
    await registerCustomer(driver);
    await addFirstProduct(driver);

    await driver.findElement(
      By.css("[data-view='cart']")
    ).click();

    await driver.wait(
      until.elementLocated(By.id("checkout-btn")),
      10000
    );

    await driver.findElement(
      By.id("checkout-btn")
    ).click();

    await waitForText(
      driver,
      By.id("notice"),
      "placed successfully"
    );

    await driver.findElement(
      By.css("[data-view='orders']")
    ).click();

    await waitForText(
      driver,
      By.id("orders"),
      "Wireless Mouse"
    );

    assert.match(
      await driver.findElement(By.id("orders")).getText(),
      /Wireless Mouse/
    );
  } finally {
    await close(driver);
  }
});
