const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors")

const app = express();
const port = process.env.PORT || 3000;

console.log('Starting server...');

// ===== CORS =====
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}));

app.options('*', (req, res) => {
  res.sendStatus(200);
});

// ===== MIDDLEWARE =====
app.use(bodyParser.json());

// ===== ENDPOINTS =====

app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Logistics Backend API',
    status: 'running',
    version: '1.0.0'
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running'
  });
});

// Mock auth endpoints for testing
app.post('/auth/login-admin', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email and password are required' 
    });
  }

  // Mock successful login for testing
  res.status(200).json({
    success: true,
    message: 'Login successful',
    token: 'mock_token_' + Date.now(),
    admin: {
      _id: '1',
      fullName: 'Test Admin',
      email: email
    }
  });
});

app.post('/auth/create-admin', (req, res) => {
  const { fullName, email, password } = req.body;
  
  if (!fullName || !email || !password) {
    return res.status(400).json({ 
      message: 'All fields are required' 
    });
  }

  res.status(200).json({
    message: `Hello ${fullName}, thanks for joining us!`
  });
});

// Mock customer endpoints
app.get('/customer', (req, res) => {
  res.status(200).json({
    customers: [
      { _id: '1', fullName: 'Customer 1', email: 'customer1@test.com' },
      { _id: '2', fullName: 'Customer 2', email: 'customer2@test.com' }
    ]
  });
});

// Mock shipment endpoints
app.get('/shipment', (req, res) => {
  res.status(200).json({
    shipments: [
      { _id: '1', trackingNumber: 'SHIP001', status: 'pending', origin: 'NYC', destination: 'LA' },
      { _id: '2', trackingNumber: 'SHIP002', status: 'in-transit', origin: 'Chicago', destination: 'Miami' }
    ]
  });
});

// ===== ERROR HANDLERS =====
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ===== START SERVER =====
const server = app.listen(port, () => {
  console.log(`✓ Server listening on port ${port}`);
  console.log(`✓ CORS enabled`);
  console.log(`✓ Ready to accept requests`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

process.on('SIGTERM', () => {
  console.log('Shutting down...');
  server.close(() => {
    process.exit(0);
  });
});
