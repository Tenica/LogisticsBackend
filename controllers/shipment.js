const Shipment = require('../model/shipment');
const Tracking = require('../model/tracking');
const Customer = require('../model/customer');
const { generateUniqueTrackingNumber } = require('../utils/helperFunctions');

// 1️⃣ Create Shipment
exports.createShipment = async (req, res) => {
  try {
    if (!req.admin?.isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { customer, sendersName, receiversName, origin, destination, weight, price, deliveryDate} = req.body;
console.log(customer, "bad id")
    const customerid = await Customer.findById(customer);
    if (!customer || customer.isDeleted) {
      return res.status(404).json({ success: false, message: 'Customer not found or deleted' });
    }

    const trackingNumber = await generateUniqueTrackingNumber();

    const shipment = new Shipment({
      trackingNumber,
      customer,
      admin: req.admin._id,
      sendersName,
      receiversName,
      origin,
      destination,
      weight,
      price,
      deliveryDate
    });

    // Initial history
    shipment.history.push({
      status: shipment.status,
      location: origin,
      note: 'Shipment created'
    });

    await shipment.save();

    // Initial tracking
    const tracking = new Tracking({
      shipment: shipment._id,
      status: shipment.status,
      location: origin
    });

    await tracking.save();

    res.status(201).json({
      success: true,
      message: 'Shipment created successfully',
      shipment,
      tracking
    });

  } catch (error) {
    console.error('Error creating shipment:', error);
    res.status(500).json({ success: false, message: 'Server error', error });
  }
};

// 2️⃣ Update Shipment (tracking/history only if status/location changes)
exports.updateShipment = async (req, res) => {
  try {
    // 🔒 Admin authorization check
    if (!req.admin?.isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { id } = req.params;
    const { origin, destination, sendersName, receiversName, weight, price, deliveredAt, status, location, note } = req.body;

    // 🔍 Find shipment
    const shipment = await Shipment.findOne({ _id: id, isDeleted: false });
    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    // ✅ Track whether timeline should be created
    let createTracking = false;
    const historyEntry = {};

    // ✅ Check if status or location actually changed
    const statusChanged = status && status !== shipment.status;
    const locationChanged = location && location !== shipment.location;

    // ✏️ Update fields (basic info)
    if (origin) shipment.origin = origin;
    if (destination) shipment.destination = destination;
    if (sendersName) shipment.sendersName = sendersName;
    if (receiversName) shipment.receiversName = receiversName;
    if (weight) shipment.weight = weight;
    if (price) shipment.price = price;
    if (deliveredAt) shipment.deliveredAt = deliveredAt;
    if (location) shipment.location = location;

    // 🧩 Create timeline if necessary
    if (statusChanged || locationChanged) {
      createTracking = true;

      if (statusChanged) {
        shipment.status = status;
        historyEntry.status = status;
      }

      if (locationChanged) {
        historyEntry.location = location;
      }

      historyEntry.note =
        note ||
        (statusChanged && locationChanged
          ? `Status updated to ${status} at ${location}`
          : statusChanged
          ? `Status updated to ${status}`
          : `Location updated to ${location}`);

      historyEntry.updatedAt = new Date();
      shipment.history.push(historyEntry);

      const tracking = new Tracking({
        shipment: shipment._id,
        status: status || shipment.status,
        location: location || shipment.origin,
      });

      await tracking.save();
    }

    // 💾 Save updates
    await shipment.save();

    // ✅ Response message depending on whether a timeline was created
    const message = createTracking
      ? 'Shipment updated successfully with new timeline entry'
      : 'Shipment details updated successfully';

    res.status(200).json({
      success: true,
      message,
      shipment,
    });
  } catch (error) {
    console.error('Error updating shipment:', error);
    res.status(500).json({ success: false, message: 'Server error', error });
  }
};


exports.getShipmentTimeline = async (req, res) => {
  try {
    // Get admin ID from authenticated user (e.g. from middleware)
    const loggedInAdminId = req.admin?.id; // assuming you store decoded JWT user here

    const { shipmentId } = req.params;

    // Validate ID format
    if (!shipmentId || shipmentId.length !== 24) {
      return res.status(400).json({
        success: false,
        message: 'Invalid shipment ID format',
      });
    }

    // Find shipment and include creator admin
    const shipment = await Shipment.findOne({
      _id: shipmentId,
      isDeleted: false,
    })
      .populate('customer', 'fullName email phone admin') // ensure customer.admin exists
      .populate('admin', 'fullName email');

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found',
      });
    }

    // Check if logged-in admin is the same as the admin who created the shipment/customer
    const shipmentAdminId = shipment.admin?._id?.toString();
    const customerAdminId = shipment.customer?.admin?._id?.toString();

    if (
      !loggedInAdminId ||
      (loggedInAdminId !== shipmentAdminId && loggedInAdminId !== customerAdminId)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to view this shipment timeline',
      });
    }

    // Fetch shipment timeline (tracking updates)
    const timeline = await Tracking.find({ shipment: shipmentId })
      .sort({ timestamp: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Shipment timeline fetched successfully',
      shipment,
      timeline,
    });

  } catch (error) {
    console.error('Error fetching shipment timeline:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching shipment timeline',
      error: error.message,
    });
  }
};


// 3️⃣ Delete Shipment (soft delete)
exports.deleteShipment = async (req, res) => {
  try {
    const loggedInAdminId = req.admin?._id || req.user?._id;

    // Ensure the user is an admin
    if (!loggedInAdminId) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const id = req.params.id;

    // Find shipment by ID
    const shipment = await Shipment.findOne({ _id: id, admin: loggedInAdminId });
    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found or you do not have permission to delete it',
      });
    }

    // Soft delete
    shipment.isDeleted = true;
    shipment.deletedAt = new Date(); // optional if you have deletedAt in schema
    await shipment.save();

    res.status(200).json({
      success: true,
      message: 'Shipment deleted successfully',
      shipment,
    });

  } catch (error) {
    console.error('Error deleting shipment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting shipment',
      error: error.message,
    });
  }
};


// 4️⃣ Get Shipment Timeline (from Tracking collection)

// exports.getShipmentTimeline = async (req, res) => {
//   try {
//     // Ensure only admins can access
//     if (false) {
//       return res.status(403).json({
//         success: false,
//         message: 'Admin access required',
//       });
//     }

//     const { shipmentId } = req.params;

//     // Validate ID format
//     if (!shipmentId || shipmentId.length !== 24) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid shipment ID format',
//       });
//     }

//     // Find shipment
//     const shipment = await Shipment.findOne({
//       _id: shipmentId,
//       isDeleted: false,
//     })
//       .populate('customer', 'fullName email phone')
//       .populate('admin', 'fullName email');

//     if (!shipment) {
//       return res.status(404).json({
//         success: false,
//         message: 'Shipment not found',
//       });
//     }

//     // Fetch shipment timeline (tracking updates)
//     const timeline = await Tracking.find({ shipment: shipmentId })
//       .sort({ timestamp: 1 })
//       .lean();

//     res.status(200).json({
//       success: true,
//       message: 'Shipment timeline fetched successfully',
//       shipment,
//       timeline,
//     });

//   } catch (error) {
//     console.error('Error fetching shipment timeline:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error while fetching shipment timeline',
//       error: error.message,
//     });
//   }
// };

exports.getAllShipments = async (req, res) => {
  try {
    // Get logged-in admin ID (from your auth middleware)
    const loggedInAdminId = req.admin?.id;

    // Ensure user is authenticated
    if (!loggedInAdminId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Please log in as an admin.',
      });
    }

    // Find all shipments created by this admin that are not deleted
    const shipments = await Shipment.find({
      isDeleted: false,
      admin: loggedInAdminId, // filter by admin
    })
      .populate('customer', 'fullName email phone')
      .sort({ createdAt: -1 });

    // Optional: Handle empty results
    if (!shipments.length) {
      return res.status(404).json({
        success: false,
        message: 'No shipments found for this admin.',
        count: 0,
        shipments: [],
      });
    }

    // Success response
    res.status(200).json({
      success: true,
      count: shipments.length,
      shipments,
    });

  } catch (error) {
    console.error('Error fetching shipments:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching shipments.',
      error: error.message,
    });
  }
};



// ✅ Get All Deleted Shipments (Only for the logged-in admin)
exports.getDeletedShipments = async (req, res) => {
  try {
    const loggedInAdminId = req.admin?._id || req.user?._id;

    // Ensure the user is an admin
    if (!loggedInAdminId) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    // Fetch only shipments deleted by this admin
    const deletedShipments = await Shipment.find({
      isDeleted: true,
      admin: loggedInAdminId,
    })
      .sort({ deletedAt: -1 })
      .populate('customer', 'fullName email phone');

    // Response
    res.status(200).json({
      success: true,
      count: deletedShipments.length,
      deletedShipments,
    });

  } catch (error) {
    console.error('Error fetching deleted shipments:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching deleted shipments',
      error: error.message,
    });
  }
};



