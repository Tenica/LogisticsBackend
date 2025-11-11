const crypto = require('crypto');
const Shipment = require('../model/shipment');

/**
 * Generate a truly unique tracking number.
 * Format: MSL-ABCDE12345
 */
exports.generateUniqueTrackingNumber = async () => {
  let trackingNumber;
  let isUnique = false;

  while (!isUnique) {
    // Generate a random hex string
    const randomHex = crypto.randomBytes(5).toString('hex').toUpperCase();
    trackingNumber = `MSL-${randomHex}`;

    // Check if tracking number already exists in DB
    const existing = await Shipment.findOne({ trackingNumber });
    if (!existing) {
      isUnique = true;
    }
  }

  return trackingNumber;
};

