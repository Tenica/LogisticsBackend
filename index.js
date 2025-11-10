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

console.log('=== Server Starting ===');
console.log('MONGODB_URL set:', !!MONGODB_URI);

// ===== CORS =====
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
  maxAge: 86400
}));

app.options('*', (req, res) => {
  res.sendStatus(200);
});

// ===== MIDDLEWARE =====
try {
  const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), {flags: 'a'})
  app.use(compression());
  app.use(morgan('combined', {stream: accessLogStream}))
} catch (err) {
  console.warn('Warning setting up middleware:', err.message);
}

app.use(bodyParser.json());

// ===== ENDPOINTS =====

// Health check
app.get('/health', (req, res) => {
  try {
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.status(200).json({ 
      status: 'OK', 
      message: 'Server is running',
      mongodb: mongoStatus,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(200).json({ status: 'OK', message: 'Server is running' });
  }
});

// ===== LOAD ROUTES SAFELY =====
const loadRoute = (path, name) => {
  try {
    const route = require(path);
    console.log(`✓ Loaded ${name} route`);
    return route;
  } catch (err) {
    console.error(`✗ Failed to load ${name} route:`, err.message);
    return null;
  }
};

const authRoute = loadRoute("./routes/auth.js", "auth");
const customerRoute = loadRoute("./routes/customer.js", "customer");
const shipmentRoute = loadRoute("./routes/shipment.js", "shipment");
const trackRoute = loadRoute("./routes/tracking.js", "tracking");

// ===== APPLY ROUTES =====
if (authRoute) {
  app.use("/auth", (err, req, res, next) => {
    if (err) {
      console.error('Auth route error:', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
    next();
  }, authRoute);
} else {
  app.post("/auth/login-admin", (req, res) => {
    res.status(503).json({ error: 'Auth service unavailable' });
  });
}

if (customerRoute) app.use("/customer", customerRoute);
if (shipmentRoute) app.use("/shipment", shipmentRoute);
if (trackRoute) app.use("/track", trackRoute);

// ===== ERROR HANDLERS =====
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ===== START SERVER =====
try {
  const server = app.listen(port, () => {
    console.log(`✓ Server listening on port ${port}`);
    console.log(`✓ CORS enabled for all origins`);
    console.log(`✓ Health endpoint: GET /health`);
  });

  server.on('error', (err) => {
    console.error('Server error:', err);
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM received');
    server.close(() => {
      if (mongoose.connection.readyState !== 0) {
        mongoose.connection.close();
      }
      process.exit(0);
    });
  });
} catch (err) {
  console.error('Failed to start server:', err.message);
  process.exit(1);
}

// ===== MONGODB CONNECTION =====
if (MONGODB_URI) {
  console.log('Attempting MongoDB connection...');
  
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
      console.error('✗ MongoDB connection failed:', err.message);
      console.log('⚠ Server running without database');
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
  console.warn('⚠ MONGODB_URL environment variable not set');
}
