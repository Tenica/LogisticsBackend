const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const trackingSchema = new mongoose.Schema({
  shipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment', required: true },
  status: { type: String, required: true },
  location: { type: String },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Tracking', trackingSchema);