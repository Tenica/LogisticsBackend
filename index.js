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

// CORS Configuration
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
  maxAge: 86400
}));

// Additional CORS headers as fallback
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Require and use the routes
const authRoute = require("./routes/auth.js");
const customerRoute = require("./routes/customer.js");
const shipmentRoute = require("./routes/shipment.js");
const trackRoute = require("./routes/tracking.js")

const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'),
{flags: 'a'})

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

// Routes
app.use("/auth", authRoute);
app.use("/customer", customerRoute);
app.use("/shipment", shipmentRoute)
app.use("/track", trackRoute)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server immediately
const server = app.listen(port, () => {
  console.log(`✓ Server running on port ${port}`);
  console.log(`✓ Health check: GET /health`);
});

// Connect to MongoDB
if (MONGODB_URI) {
  console.log('Attempting to connect to MongoDB...');
  mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  })
    .then((result) => {
      console.log('✓ MongoDB connected successfully');
    })
    .catch((err) => {
      console.error('✗ MongoDB connection error:', err.message);
      console.warn('⚠ Server running without database - add MONGODB_URL environment variable');
    });

  // Connection event listeners
  mongoose.connection.on('connected', () => {
    console.log('✓ MongoDB reconnected');
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠ MongoDB disconnected');
  });

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB error:', err.message);
  });
} else {
  console.warn('⚠ MONGODB_URL environment variable is not set');
}

// Handle server errors
server.on('error', (err) => {
  console.error('Server error:', err);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    if (MONGODB_URI) {
      mongoose.connection.close();
    }
    process.exit(0);
  });
});
