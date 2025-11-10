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

// CORS Configuration - MUST be before routes
app.use(cors({
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}));

// Handle OPTIONS requests explicitly
app.options('*', cors());

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
  console.log('✓ Routes loaded successfully');
} catch (err) {
  console.error('Error loading routes:', err.message);
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

// Start server IMMEDIATELY
const server = app.listen(port, () => {
  console.log(`✓ Server running on port ${port}`);
  console.log(`✓ CORS enabled for all origins`);
  console.log(`✓ Health check: GET /health`);
});

// Connect to MongoDB asynchronously
if (MONGODB_URI) {
  console.log('Connecting to MongoDB...');
  
  mongoose.set('maxPoolSize', 10);
  mongoose.set('minPoolSize', 2);
  
  mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    maxPoolSize: 10,
    retryWrites: false
  })
    .then(() => {
      console.log('✓ MongoDB connected');
    })
    .catch((err) => {
      console.error('✗ MongoDB failed:', err.message);
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
  console.warn('⚠ MONGODB_URL not set');
}

server.on('error', (err) => {
  console.error('Server error:', err);
});

process.on('SIGTERM', () => {
  console.log('Shutting down...');
  server.close(() => {
    if (mongoose.connection.readyState !== 0) {
      mongoose.connection.close();
    }
    process.exit(0);
  });
});
