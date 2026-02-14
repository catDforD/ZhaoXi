import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({
    executablePath: '/home/gargantua/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome',
    headless: true
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '../verify-screenshot.png', fullPage: true });
  console.log('Screenshot saved to verify-screenshot.png');
  await browser.close();
})();
