const axios = require('axios');

async function test() {
    try {
        const res = await axios.get('http://localhost:8080/api/shipments');
        console.log("Shipments data:", JSON.stringify(res.data, null, 2));
    } catch(e) {
        console.error(e.message);
    }
}
test();
