const path = require("path");
const fs = require("fs");
const dotenv = require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const app = express();
const port = process.env.PORT || 3000;

console.log('=== Backend Starting ===');
console.log('MONGODB_URL set:', !!process.env.MONGODB_URL);

// ===== MIDDLEWARE =====
app.use(bodyParser.json());

// Enable CORS manually
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ===== ENDPOINTS =====

app.get('/', (req, res) => {
  res.json({ 
    message: 'Logistics Backend API',
    status: 'running'
  });
});

app.get('/health', (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ 
    status: 'OK',
    mongodb: mongoStatus
  });
});

// ===== LOAD ROUTES SAFELY =====
let authRoute, customerRoute, shipmentRoute, trackRoute;

try {
  authRoute = require("./routes/auth.js");
  customerRoute = require("./routes/customer.js");
  shipmentRoute = require("./routes/shipment.js");
  trackRoute = require("./routes/tracking.js");
  console.log('✓ Routes loaded successfully');
} catch (err) {
  console.error('✗ Error loading routes:', err.message);
}

// ===== APPLY ROUTES =====
if (authRoute) app.use("/auth", authRoute);
if (customerRoute) app.use("/customer", customerRoute);
if (shipmentRoute) app.use("/shipment", shipmentRoute);
if (trackRoute) app.use("/track", trackRoute);

// Fallback auth endpoints if routes fail
if (!authRoute) {
  app.post('/auth/login-admin', (req, res) => {
    res.status(503).json({ error: 'Auth service unavailable' });
  });
  app.post('/auth/create-admin', (req, res) => {
    res.status(503).json({ error: 'Auth service unavailable' });
  });
}

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
});

server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

// ===== MONGODB CONNECTION =====
const MONGODB_URI = process.env.MONGODB_URL;

if (MONGODB_URI) {
  console.log('Connecting to MongoDB...');
  
  mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    maxPoolSize: 10,
    retryWrites: false,
    retryReads: false
  })
    .then(() => {
      console.log('✓ MongoDB connected successfully');
    })
    .catch((err) => {
      console.error('✗ MongoDB connection failed:', err.message);
      console.log('⚠ Server running without database');
    });

  mongoose.connection.on('connected', () => {
    console.log('✓ Mongoose connected');
  });

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠ MongoDB disconnected');
  });
} else {
  console.warn('⚠ MONGODB_URL not set - database features disabled');
}

// ===== GRACEFUL SHUTDOWN =====
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  server.close(() => {
    if (mongoose.connection.readyState !== 0) {
      mongoose.connection.close();
    }
    process.exit(0);
  });
});
