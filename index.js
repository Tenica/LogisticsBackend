const path = require("path");
const fs = require("fs");
const dotenv = require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const compression = require('compression');
const morgan = require('morgan');
const cors = require("cors")

const MONGODB_URI = process.env.MONGODB_URL;

const app = express();
const port = process.env.PORT || 3000;

// CORS Configuration
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}));

// Middleware
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), {flags: 'a'})
app.use(compression());
app.use(morgan('combined', {stream: accessLogStream}))
app.use(bodyParser.json());

// ===== ENDPOINTS =====

// Health check - ALWAYS works
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK',
    message: 'Backend is running',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint - ALWAYS works
app.get('/test', (req, res) => {
  res.status(200).json({ 
    message: 'Test endpoint working',
    backend: 'operational'
  });
});

// Mock login endpoint - works without database
app.post('/auth/login-admin', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email and password are required' 
    });
  }

  if (mongoose.connection.readyState !== 1) {
    // Database not connected - return mock response for testing
    return res.status(200).json({
      success: true,
      message: 'Login successful (demo mode)',
      token: 'demo_token_' + Date.now(),
      admin: {
        _id: '1',
        fullName: 'Demo Admin',
        email: email
      }
    });
  }

  // Try to use real database if connected
  try {
    const Admin = require("./model/admin");
    Admin.findByCredentials(email, password)
      .then(admin => {
        res.status(200).json({
          success: true,
          message: 'Login successful',
          token: admin.token,
          admin: admin
        });
      })
      .catch(err => {
        res.status(401).json({ 
          success: false, 
          message: 'Invalid email or password' 
        });
      });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mock signup endpoint - works without database
app.post('/auth/create-admin', (req, res) => {
  const { fullName, email, password } = req.body;
  
  if (!fullName || !email || !password) {
    return res.status(400).json({ 
      message: 'All fields are required' 
    });
  }

  if (mongoose.connection.readyState !== 1) {
    // Database not connected - return mock response for testing
    return res.status(200).json({
      message: `Hello ${fullName}, thanks for joining us! (Demo mode)`
    });
  }

  // Try to use real database if connected
  try {
    const Admin = require("./model/admin");
    const admin = new Admin({ fullName, email, password });
    
    admin.save()
      .then(savedAdmin => {
        res.status(200).json({ 
          message: `Hello ${savedAdmin.fullName}, thanks for joining us` 
        });
      })
      .catch(err => {
        res.status(400).json({ 
          message: err.message || 'Error creating admin' 
        });
      });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get customers - mock data if database not available
app.get('/customer', (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(200).json({
      customers: [
        { _id: '1', fullName: 'Demo Customer 1', email: 'customer1@demo.com' },
        { _id: '2', fullName: 'Demo Customer 2', email: 'customer2@demo.com' }
      ]
    });
  }

  try {
    const Customer = require("./model/customer");
    Customer.find()
      .then(customers => {
        res.status(200).json({ customers });
      })
      .catch(err => {
        res.status(500).json({ error: err.message });
      });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get shipments - mock data if database not available
app.get('/shipment', (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(200).json({
      shipments: [
        { _id: '1', trackingNumber: 'DEMO001', status: 'pending', origin: 'NYC', destination: 'LA' },
        { _id: '2', trackingNumber: 'DEMO002', status: 'in-transit', origin: 'Chicago', destination: 'Miami' }
      ]
    });
  }

  try {
    const Shipment = require("./model/shipment");
    Shipment.find()
      .then(shipments => {
        res.status(200).json({ shipments });
      })
      .catch(err => {
        res.status(500).json({ error: err.message });
      });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ===== START SERVER =====

const server = app.listen(port, () => {
  console.log(`✓ Server listening on port ${port}`);
  console.log(`✓ Health: GET /health`);
  console.log(`✓ Test: GET /test`);
});

// ===== MONGODB CONNECTION =====

if (MONGODB_URI) {
  console.log('Attempting MongoDB connection...');
  mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 5000,
  })
    .then(() => {
      console.log('✓ MongoDB connected');
    })
    .catch((err) => {
      console.warn('✗ MongoDB failed:', err.message);
      console.log('⚠ Running in demo mode without database');
    });
} else {
  console.warn('⚠ MONGODB_URL not set - running in demo mode');
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  server.close();
});
