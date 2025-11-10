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

// CORS Configuration - Allow all origins for now, can be restricted later
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
  maxAge: 86400 // 24 hours
}));

// Additional CORS headers as fallback
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
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
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Routes
app.use("/auth", authRoute);
app.use("/customer", customerRoute);
app.use("/shipment", shipmentRoute)
app.use("/track", trackRoute)

// Start server immediately (don't wait for MongoDB)
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Connect to MongoDB
if (MONGODB_URI) {
  mongoose
    .connect(MONGODB_URI)
    .then((result) => {
      console.log('MongoDB connected successfully');
    })
    .catch((err) => {
      console.error('MongoDB connection error:', err.message);
    });
} else {
  console.warn('MONGODB_URL environment variable is not set');
}

// Handle server errors
server.on('error', (err) => {
  console.error('Server error:', err);
});
