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
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3004',
  process.env.FRONTEND_URL || 'http://localhost:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}));

// Require and use the routes
// const userRoute = require("./routes/user");
const authRoute = require("./routes/auth.js");
const customerRoute = require("./routes/customer.js");
const shipmentRoute = require("./routes/shipment.js");
const trackRoute = require("./routes/tracking.js")


// const { get404 } = require("./controller/error");

const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'),
{flags: 'a'})


app.use(compression());
app.use(morgan('combined', {stream: accessLogStream}))

app.use(bodyParser.json());

// app.use("/", userRoute);
app.use("/auth", authRoute);
app.use("/customer", customerRoute);
app.use("/shipment", shipmentRoute)
app.use("/track", trackRoute)

// app.use(get404);

mongoose
  .connect(MONGODB_URI)
  .then((result) => {
    app.listen(port);
    console.log(`Server running on port ${port}`);
  })
  .catch((err) => {
    console.log(err);
  });
