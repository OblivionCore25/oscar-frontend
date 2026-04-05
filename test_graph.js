// simple test script using puppeteer to connect to local
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER_LOG:', msg.text()));
  
  await page.goto('http://localhost:5173/graph?ecosystem=npm&package=react&version=18.2.0');
  
  // wait for "Explore Topology" button
  await page.waitForXPath("//button[contains(., 'Explore Topology')]", {timeout: 10000});
  const buttons = await page.$x("//button[contains(., 'Explore Topology')]");
  if (buttons.length > 0) {
    console.log("Clicking Explore Topology...");
    await buttons[0].click();
  }
  
  await new Promise(r => setTimeout(r, 2000));
  
  // click random point in canvas
  const canvas = await page.$('canvas');
  const box = await canvas.boundingBox();
  console.log("Canvas box:", box);
  
  // clicking canvas multiple times
  await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
  await new Promise(r => setTimeout(r, 500));
  
  await page.mouse.click(box.x + box.width/2 + 10, box.y + box.height/2 + 10);
  await new Promise(r => setTimeout(r, 1000));
  
  // click some more randomly to ensure we hit a node
  for (let i = 0; i < 5; i++) {
     await page.mouse.click(box.x + box.width/2 + (Math.random()-0.5)*200, box.y + box.height/2 + (Math.random()-0.5)*200);
     await new Promise(r => setTimeout(r, 200));
  }
  
  // check if panel rendered
  const panel = await page.$x('//h3[contains(text(), "Selected Dependency")]');
  if (panel.length > 0) {
      console.log("PANEL FOUND!");
  } else {
      console.log("PANEL NOT FOUND.");
  }
  
  await browser.close();
})();
