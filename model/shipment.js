const mongoose = require("mongoose");
const Schema = mongoose.Schema;




const shipmentSchema = new mongoose.Schema({
  trackingNumber: { type: String, unique: true, required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  origin: { type: String, required: true },
  destination: { type: String, required: true },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  sendersName: {
        type: String,
        required: true,
    },
    receiversName: {
        type: String,
        required: true,
    },
  weight: { type: Number },
  price: { type: Number },
  location: {type: String},
  history: [
    {
      status: { type: String, required: true },
      note: { type: String },
      updatedAt: { type: Date, default: Date.now }
    }
  ],
  status: {
    type: String,
    enum: ['pending', 'assigned', 'in-transit', 'delivered', 'cancelled'],
    default: 'pending'
  },
   isDeleted: {
    type: Boolean,
    default: false
  },
  createdAt: { type: Date, default: Date.now },
  deliveredAt: { type: Date }
});

module.exports = mongoose.model('Shipment', shipmentSchema);






