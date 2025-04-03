#!/usr/bin/env node

import http from 'http';

// Function to check if DynamoDB is running
function checkDynamoDB() {
  return new Promise((resolve, reject) => {
    const req = http.request({
      method: 'POST',
      hostname: 'localhost',
      port: 8000,
      path: '/',
      headers: {
        'Content-Type': 'application/json',
        'X-Amz-Target': 'DynamoDB_20120810.ListTables'
      },
      timeout: 3000 // 3 second timeout
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          console.error(`DynamoDB returned status code ${res.statusCode}`);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.error('Error connecting to DynamoDB:', error.message);
      resolve(false);
    });

    req.on('timeout', () => {
      console.error('Connection to DynamoDB timed out');
      req.destroy();
      resolve(false);
    });

    req.write(JSON.stringify({ "Limit": 1 }));
    req.end();
  });
}

// Run the check
checkDynamoDB().then(isRunning => {
  if (!isRunning) {
    process.exit(1);
  }
}); 