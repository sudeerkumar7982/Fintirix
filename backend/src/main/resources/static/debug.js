const puppeteer = require('puppeteer');

(async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  
  console.log("Navigating to frontend...");
  await page.goto('http://localhost:8000/', { waitUntil: 'networkidle0' }).catch(err => {
    console.log("Failed to load page directly from Deno, trying file URL...");
  });

  // Wait for page to render
  await page.waitForTimeout(1000);

  console.log("Trying to find btn-landing-login...");
  const btn = await page.$('#btn-landing-login');
  if (btn) {
    console.log("Button found! Clicking...");
    await btn.click();
    await page.waitForTimeout(500);
    
    const overlay = await page.$('#google-overlay');
    const isHidden = await page.evaluate(el => el.classList.contains('hidden'), overlay);
    console.log("Overlay hidden?", isHidden);
    
    // Now try to type and login
    await page.type('#login-email', 'test@test.com');
    await page.type('#login-password', 'password');
    await page.click('#btn-email-login');
    
    await page.waitForTimeout(1000);
    const errorEl = await page.$('#login-error');
    const errorText = await page.evaluate(el => el.textContent, errorEl);
    const errHidden = await page.evaluate(el => el.classList.contains('hidden'), errorEl);
    console.log("Login Error Text:", errorText, "Hidden:", errHidden);

  } else {
    console.log("btn-landing-login NOT FOUND!");
  }
  
  await browser.close();
})();
