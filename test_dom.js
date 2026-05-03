const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173/graph?ecosystem=npm&package=react&version=18.2.0');
  
  // wait for "Explore Topology" button
  await page.waitForXPath("//button[contains(., 'Explore Topology')]", {timeout: 60000});
  const buttons = await page.$x("//button[contains(., 'Explore Topology')]");
  if (buttons.length > 0) {
    await buttons[0].click();
  }
  
  await new Promise(r => setTimeout(r, 2000));
  
  // click manually the react node
  // In the active canvas, the root is usually near center.
  const canvas = await page.$('canvas');
  const box = await canvas.boundingBox();
  await page.mouse.click(box.x + box.width/2, box.y + box.height/2 + 20);
  await new Promise(r => setTimeout(r, 1000));
  
  const html = await page.evaluate(() => document.body.innerHTML);
  if (html.includes('Selected Dependency')) {
      console.log("PANEL DOM FOUND!");
  } else {
      console.log("PANEL DOM NOT FOUND!");
  }
  
  await browser.close();
})();
