const path = require("path");
const fs = require("fs");
const dotenv = require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cors = require("cors")

const MONGODB_URI = process.env.MONGODB_URL;

const app = express();
const port = process.env.PORT || 3000;

console.log('Starting server...');
console.log('MONGODB_URL set:', !!MONGODB_URI);

// CORS Configuration
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
  maxAge: 86400
}));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), {flags: 'a'})
app.use(compression());
app.use(morgan('combined', {stream: accessLogStream}))
app.use(bodyParser.json());

// Health check endpoint
app.get('/health', (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    mongodb: mongoStatus,
    timestamp: new Date().toISOString()
  });
});

// Routes - load with error handling
let authRoute, customerRoute, shipmentRoute, trackRoute;

try {
  authRoute = require("./routes/auth.js");
  customerRoute = require("./routes/customer.js");
  shipmentRoute = require("./routes/shipment.js");
  trackRoute = require("./routes/tracking.js");
} catch (err) {
  console.error('Error loading routes:', err.message);
  // Routes might depend on models, continue anyway
}

// Apply routes if they loaded
if (authRoute) app.use("/auth", authRoute);
if (customerRoute) app.use("/customer", customerRoute);
if (shipmentRoute) app.use("/shipment", shipmentRoute);
if (trackRoute) app.use("/track", trackRoute);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server IMMEDIATELY - do not wait for database
const server = app.listen(port, () => {
  console.log(`✓ Server running on port ${port}`);
  console.log(`✓ Health check: GET /health`);
});

// Connect to MongoDB ASYNCHRONOUSLY with no blocking
if (MONGODB_URI) {
  console.log('Connecting to MongoDB (non-blocking)...');
  
  // Set connection timeout and retry
  mongoose.set('maxPoolSize', 10);
  mongoose.set('minPoolSize', 2);
  
  mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 30000, // 30 seconds
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
      console.log('⚠ Server running in mode - database operations will fail gracefully');
    });

  mongoose.connection.on('connected', () => {
    console.log('✓ Mongoose connected to MongoDB');
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

// Handle server errors
server.on('error', (err) => {
  console.error('Server error:', err);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  server.close(() => {
    console.log('Server closed');
    if (mongoose.connection.readyState !== 0) {
      mongoose.connection.close();
    }
    process.exit(0);
  });
});
