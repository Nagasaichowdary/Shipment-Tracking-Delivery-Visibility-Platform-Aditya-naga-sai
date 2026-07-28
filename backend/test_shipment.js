const http = require('http');

const data = JSON.stringify({
  email: "admin@shiptrack.com",
  password: "admin123"
});

const req = http.request('http://localhost:8080/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log("Login Res:", body);
    const token = JSON.parse(body).token;
    
    // Create shipment
    const shipData = JSON.stringify({
        senderName: "John Doe",
        senderPhone: "1234567890",
        receiverName: "Jane Doe",
        receiverPhone: "0987654321",
        originAddress: {
            line1: "123 Main St",
            city: "NYC",
            state: "NY",
            postalCode: "10001",
            country: "USA"
        },
        destinationAddress: {
            line1: "456 Market St",
            city: "SF",
            state: "CA",
            postalCode: "94105",
            country: "USA"
        },
        packageWeight: 5.5,
        shipmentType: "STANDARD"
    });
    
    const shipReq = http.request('http://localhost:8080/api/shipments', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': shipData.length,
            'Authorization': 'Bearer ' + token
        }
    }, shipRes => {
        let sBody = '';
        shipRes.on('data', chunk => sBody += chunk);
        shipRes.on('end', () => console.log("Create Shipment Res:", sBody));
    });
    shipReq.write(shipData);
    shipReq.end();
  });
});
req.write(data);
req.end();
