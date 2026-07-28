const puppeteer = require('puppeteer');

(async () => {
    try {
        const browser = await puppeteer.launch({headless: 'new'});
        const page = await browser.newPage();
        
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        
        await page.goto('http://localhost:5173/login', {waitUntil: 'networkidle2'}).catch(e => console.log('goto err', e));
        
        await page.type('#emailInput', 'aditya@gmail.com');
        await page.type('#passwordInput', 'password');
        
        console.log("Clicking button...");
        await page.click('button[type="submit"]');
        
        await new Promise(r => setTimeout(r, 3000));
        await browser.close();
        console.log("Done");
    } catch (e) {
        console.error("Puppeteer error:", e);
    }
})();
