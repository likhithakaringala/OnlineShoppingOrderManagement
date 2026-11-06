const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
let counter = 0;

async function browser() {
  const options = new chrome.Options().addArguments("--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--window-size=1400,1000");
  const driver = await new Builder().forBrowser("chrome").setChromeOptions(options).build();
  await driver.get(BASE_URL);
  return driver;
}
async function registerCustomer(driver) {
  const stamp = `${Date.now()}${++counter}`;
  await driver.wait(until.elementLocated(By.css("#register-form input[name='name']")), 10000);
  await driver.findElement(By.css("#register-form input[name='name']")).sendKeys("Test Customer");
  await driver.findElement(By.css("#register-form input[name='email']")).sendKeys(`test${stamp}@example.com`);
  await driver.findElement(By.css("#register-form input[name='password']")).sendKeys("testpass123");
  await driver.findElement(By.css("#register-form button")).click();
  await driver.wait(until.elementTextContains(By.id("user-label"), "Test Customer"), 10000);
}
async function addFirstProduct(driver) {
  await driver.findElement(By.id("search")).clear();
  await driver.findElement(By.id("search")).sendKeys("Wireless Mouse");
  await driver.wait(until.elementLocated(By.css("[data-add]")), 10000);
  await driver.findElement(By.css("[data-add]")).click();
  await driver.wait(until.elementTextContains(By.id("notice"), "added"), 10000);
}
async function close(driver) { if (driver) await driver.quit(); }

test("TC01 - Customer login", async () => {
  const driver = await browser();
  try {
    await driver.findElement(By.css("#login-form input[name='email']")).sendKeys("admin@shop.com");
    await driver.findElement(By.css("#login-form input[name='password']")).sendKeys("admin123");
    await driver.findElement(By.css("#login-form button")).click();
    await driver.wait(until.elementTextContains(By.id("user-label"), "Store Admin"), 10000);
    assert.match(await driver.findElement(By.id("user-label")).getText(), /Store Admin/);
  } finally { await close(driver); }
});

test("TC02 - Search product", async () => {
  const driver = await browser();
  try {
    await driver.findElement(By.id("search")).sendKeys("Wireless Mouse");
    await driver.wait(until.elementLocated(By.css(".product h3")), 10000);
    assert.equal(await driver.findElement(By.css(".product h3")).getText(), "Wireless Mouse");
  } finally { await close(driver); }
});

test("TC03 - Add product to cart", async () => {
  const driver = await browser();
  try {
    await registerCustomer(driver); await addFirstProduct(driver);
    await driver.findElement(By.css("[data-view='cart']")).click();
    await driver.wait(until.elementLocated(By.css(".cart-row")), 10000);
    assert.match(await driver.findElement(By.id("cart-items")).getText(), /Wireless Mouse/);
  } finally { await close(driver); }
});

test("TC04 - Update cart quantity", async () => {
  const driver = await browser();
  try {
    await registerCustomer(driver); await addFirstProduct(driver);
    await driver.findElement(By.css("[data-view='cart']")).click();
    const quantity = await driver.wait(until.elementLocated(By.css("[data-qty]")), 10000);
    await quantity.clear(); await quantity.sendKeys("2"); await quantity.sendKeys("\n");
    await driver.wait(until.elementTextContains(By.id("notice"), "updated"), 10000);
    assert.equal(await driver.findElement(By.css("[data-qty]")).getAttribute("value"), "2");
  } finally { await close(driver); }
});

test("TC05 - Remove product from cart", async () => {
  const driver = await browser();
  try {
    await registerCustomer(driver); await addFirstProduct(driver);
    await driver.findElement(By.css("[data-view='cart']")).click();
    await driver.wait(until.elementLocated(By.css("[data-remove]")), 10000);
    await driver.findElement(By.css("[data-remove]")).click();
    await driver.wait(until.elementTextContains(By.id("cart-items"), "empty"), 10000);
    assert.match(await driver.findElement(By.id("cart-items")).getText(), /empty/i);
  } finally { await close(driver); }
});

test("TC06 - Checkout", async () => {
  const driver = await browser();
  try {
    await registerCustomer(driver); await addFirstProduct(driver);
    await driver.findElement(By.css("[data-view='cart']")).click();
    await driver.wait(until.elementLocated(By.id("checkout-btn")), 10000);
    await driver.findElement(By.id("checkout-btn")).click();
    await driver.wait(until.elementTextContains(By.id("notice"), "placed successfully"), 10000);
    assert.match(await driver.findElement(By.id("notice")).getText(), /placed successfully/);
  } finally { await close(driver); }
});

test("TC07 - View order history", async () => {
  const driver = await browser();
  try {
    await registerCustomer(driver); await addFirstProduct(driver);
    await driver.findElement(By.css("[data-view='cart']")).click();
    await driver.wait(until.elementLocated(By.id("checkout-btn")), 10000);
    await driver.findElement(By.id("checkout-btn")).click();
    await driver.wait(until.elementTextContains(By.id("notice"), "placed successfully"), 10000);
    await driver.findElement(By.css("[data-view='orders']")).click();
    await driver.wait(until.elementTextContains(By.id("orders"), "Wireless Mouse"), 10000);
    assert.match(await driver.findElement(By.id("orders")).getText(), /Wireless Mouse/);
  } finally { await close(driver); }
});
