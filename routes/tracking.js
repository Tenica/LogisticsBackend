const express = require('express');
const { trackShipment } = require('../controllers/tracking');
const router = express.Router();



// Create shipment for a customer
router.get('/view-tracking/:trackingNumber', trackShipment);


module.exports = router;