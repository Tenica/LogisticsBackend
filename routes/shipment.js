const express = require('express');
const router = express.Router();
const isAuth = require('../middleware/is-auth');
const { createShipment, updateShipment, deleteShipment, getShipmentTimeline, getAllShipments } = require('../controllers/shipment');

// Create shipment for a customer
router.post('/create-shipment', isAuth, createShipment);

// Update shipment
router.put('/update-shipment/:id',isAuth, updateShipment);

// Soft delete shipment
router.delete('/delete-shipment/:id', isAuth, deleteShipment);

// Get shipment timeline
router.get('/shipment-timeline/:shipmentId', isAuth, getShipmentTimeline);

// Get all shipments (optional filter by customer)
router.get('/getAllShipments', isAuth, getAllShipments);

module.exports = router;
