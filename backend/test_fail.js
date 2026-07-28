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
    const token = JSON.parse(body).token;
    
    // Create shipment payload with today's date
    const today = new Date().toISOString().split('T')[0] + 'T00:00:00';
    console.log("ETA:", today);
    
    const shipData = JSON.stringify({
        senderName: "Test Sender",
        senderPhone: "9876543210",
        receiverName: "Test Receiver",
        receiverPhone: "0123456789",
        originAddress: {
          line1: "Delhi",
          city: "Delhi",
          postalCode: "000000",
          country: "India",
        },
        destinationAddress: {
          line1: "Mumbai",
          city: "Mumbai",
          postalCode: "000000",
          country: "India",
        },
        packageWeight: 1.0,
        shipmentType: "Standard",
        packageType: "General Cargo",
        expectedDeliveryDate: today,
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
