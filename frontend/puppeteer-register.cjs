const puppeteer = require('puppeteer');

(async () => {
    try {
        const browser = await puppeteer.launch({headless: 'new'});
        const page = await browser.newPage();
        
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        
        await page.goto('http://localhost:5173/register', {waitUntil: 'networkidle2'}).catch(e => console.log('goto err', e));
        
        await page.type('input[placeholder="John Doe"]', 'John Doe');
        await page.type('input[placeholder="john@company.com"]', 'john@company.com');
        await page.type('input[placeholder="Create a strong password"]', 'Password@123');
        await page.type('input[placeholder="Re-enter password"]', 'Password@123');
        
        console.log("Clicking button...");
        await page.click('button[type="submit"]');
        
        await new Promise(r => setTimeout(r, 3000));
        await browser.close();
        console.log("Done");
    } catch (e) {
        console.error("Puppeteer error:", e);
    }
})();
