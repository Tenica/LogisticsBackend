
const Tracking = require('../model/tracking');

const Shipment = require('../model/shipment');

exports.trackShipment = async (req, res) => {
  try {
    const { trackingNumber } = req.params;

    if (!trackingNumber) {
      return res.status(400).json({
        success: false,
        message: 'Tracking number is required'
      });
    }

    const shipment = await Shipment.findOne({
      trackingNumber: trackingNumber.toUpperCase(),
      isDeleted: false
    }).populate('customer', 'fullName email phone');

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Shipment found successfully',
      shipment
    });
  } catch (error) {
    console.error('Error tracking shipment:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message || 'An unexpected error occurred'
    });
  }
};





