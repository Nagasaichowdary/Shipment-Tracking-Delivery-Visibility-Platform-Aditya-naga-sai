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
    
    // Get notifications
    const getReq = http.request('http://localhost:8080/api/notifications', {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        }
    }, getRes => {
        let gBody = '';
        getRes.on('data', chunk => gBody += chunk);
        getRes.on('end', () => console.log("Notifications:", gBody));
    });
    getReq.end();
  });
});
req.write(data);
req.end();
