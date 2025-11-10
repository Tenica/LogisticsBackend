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

// ===== CORS - MUST BE FIRST =====
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  optionsSuccessStatus: 200,
  maxAge: 86400
}));

// Handle preflight requests explicitly
app.options('*', (req, res) => {
  res.sendStatus(200);
});

// ===== MIDDLEWARE =====
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), {flags: 'a'})
app.use(compression());
app.use(morgan('combined', {stream: accessLogStream}))
app.use(bodyParser.json());

// ===== HEALTH CHECK =====
app.get('/health', (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    mongodb: mongoStatus,
    timestamp: new Date().toISOString()
  });
});

// ===== ROUTES =====
let authRoute, customerRoute, shipmentRoute, trackRoute;

try {
  authRoute = require("./routes/auth.js");
  customerRoute = require("./routes/customer.js");
  shipmentRoute = require("./routes/shipment.js");
  trackRoute = require("./routes/tracking.js");
  console.log('✓ Routes loaded');
} catch (err) {
  console.error('Error loading routes:', err.message);
}

// Apply routes
if (authRoute) app.use("/auth", authRoute);
if (customerRoute) app.use("/customer", customerRoute);
if (shipmentRoute) app.use("/shipment", shipmentRoute);
if (trackRoute) app.use("/track", trackRoute);

// ===== ERROR HANDLERS =====
// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler - MUST be last
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ===== START SERVER =====
const server = app.listen(port, () => {
  console.log(`✓ Server running on port ${port}`);
  console.log(`✓ CORS enabled`);
  console.log(`✓ Health: GET /health`);
});

// ===== MONGODB CONNECTION =====
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
