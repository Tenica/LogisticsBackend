const express = require("express");
const bodyParser = require("body-parser");

const app = express();
const port = process.env.PORT || 3000;

// Simple middleware
app.use(bodyParser.json());

// Enable CORS manually
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Backend is running' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Login endpoint
app.post('/auth/login-admin', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }

  res.json({
    success: true,
    message: 'Login successful',
    token: 'test_token_' + Date.now(),
    admin: { _id: '1', fullName: 'Admin', email: email }
  });
});

// Create admin endpoint
app.post('/auth/create-admin', (req, res) => {
  const { fullName, email, password } = req.body;
  
  if (!fullName || !email || !password) {
    return res.status(400).json({ message: 'All fields required' });
  }

  res.json({ message: 'Account created successfully' });
});

// Logout endpoint
app.post('/auth/logout-admin', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// Get customers
app.get('/customer', (req, res) => {
  res.json({
    customers: [
      { _id: '1', fullName: 'Customer 1', email: 'customer1@test.com' },
      { _id: '2', fullName: 'Customer 2', email: 'customer2@test.com' }
    ]
  });
});

// Get shipments
app.get('/shipment', (req, res) => {
  res.json({
    shipments: [
      { _id: '1', trackingNumber: 'SHIP001', status: 'pending', origin: 'NYC', destination: 'LA' },
      { _id: '2', trackingNumber: 'SHIP002', status: 'in-transit', origin: 'Chicago', destination: 'Miami' }
    ]
  });
});

// Get tracking
app.get('/track', (req, res) => {
  res.json({ message: 'Tracking endpoint' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
