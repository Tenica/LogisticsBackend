
const Customer = require('../model/customer');
const Shipment = require('../model/shipment');

exports.createCustomer = async (req, res) => {
  
  try {
    if (!req.admin?.isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied: Admin only' });
    }

    const { fullName, phone, email, address, city, country } = req.body;

    if (!fullName || !phone || !email || !address || !city || !country) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const phoneRegex = /^\+?[1-9]\d{6,14}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ success: false, message: 'Invalid phone number format' });
    }

    const newCustomer = new Customer({
      fullName,
      phone,
      email,
      address,
      city,
      country,
      createdBy: req.admin._id // 🔥 Save which admin created this customer
    });

    await newCustomer.save();

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      customer: newCustomer
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ success: false, message: 'Server error', error });
  }
};



// Update a customer
exports.updateCustomer = async (req, res) => {
  try {
    const loggedInAdminId = req.admin?._id || req.user?._id;

    // 🔒 Admin authorization check
    if (!loggedInAdminId) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { id } = req.params;
    const { fullName, phone, email, address, city, country } = req.body;

    // 🔍 Find customer owned by this admin
    const customer = await Customer.findOne({
      _id: id,
      createdBy: loggedInAdminId,  // ownership check
      isDeleted: false
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found or you are not authorized to update it',
      });
    }

    // ✏️ Update fields if provided
    if (fullName) customer.fullName = fullName;
    if (phone) customer.phone = phone;
    if (email) customer.email = email;
    if (address) customer.address = address;
    if (city) customer.city = city;
    if (country) customer.country = country;

    await customer.save();

    res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      customer
    });

  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating customer',
      error: error.message
    });
  }
};




exports.deleteCustomer = async (req, res) => {
  try {
    const loggedInAdminId = req.admin?._id || req.user?._id;

    // 🔒 Admin authorization check
    if (!loggedInAdminId) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const customerId = req.params.id;

    // 🔍 Find customer owned by this admin
    const customer = await Customer.findOne({
      _id: customerId,
      createdBy: loggedInAdminId,
      isDeleted: false,
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found, already deleted, or you are not authorized to delete it',
      });
    }

    // 🚫 Soft-delete the customer
    customer.isDeleted = true;
    customer.deletedAt = new Date(); // optional if using deletedAt
    await customer.save();

    // 🚛 Soft-delete shipments of this customer **created by this admin**
    const result = await Shipment.updateMany(
      { customer: customerId, admin: loggedInAdminId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );

    res.status(200).json({
      success: true,
      message: `Customer and ${result.modifiedCount} associated shipment(s) deleted successfully`,
      customerId,
    });

  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting customer',
      error: error.message,
    });
  }
};


exports.getCustomersByAdmin = async (req, res) => {
  try {
    if (!req.admin?.isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied: Admin only' });
    }

    const adminId = req.admin._id;

    // Only show non-deleted customers
    const customers = await Customer.find({
      createdBy: adminId,
      isDeleted: false
    }).sort({ createdAt: -1 });

    if (customers.length === 0) {
      return res.status(404).json({ success: false, message: 'No active customers found for this admin' });
    }

    res.status(200).json({
      success: true,
      total: customers.length,
      customers
    });
  } catch (error) {
    console.error('Error fetching customers by admin:', error);
    res.status(500).json({ success: false, message: 'Server error', error });
  }
};

// Get a single customer by ID
exports.getCustomerById = async (req, res) => {
    const loggedInAdminId = req.admin?._id;
  try {
    // ✅ Only admin can view customer details
    if (!req.admin?.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Admin only'
      });
    }

    const { id } = req.params;

    // ✅ Find the customer by ID but exclude deleted ones
    const customer = await Customer.findOne({ _id: id, isDeleted: false, createdBy:loggedInAdminId})
      .populate('createdBy', 'fullName email') // optional: show admin info
      .select('-__v'); // optional: hide version field

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found or deleted'
      });
    }

    res.status(200).json({
      success: true,
      customer
    });
  } catch (error) {
    console.error('Error fetching customer by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error
    });
  }
};



// ✅ Get All Deleted Customers (Only for the logged-in admin)
exports.getDeletedCustomers = async (req, res) => {
  try {
    const loggedInAdminId = req.admin?._id;

    // 🔒 Admin authorization check
    if (!loggedInAdminId) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    // Fetch only deleted customers created by this admin
    const deletedCustomers = await Customer.find({
      isDeleted: true,
      createdBy: loggedInAdminId, // filter by admin ownership
    }).sort({ deletedAt: -1 });

    // Response
    res.status(200).json({
      success: true,
      count: deletedCustomers.length,
      customers: deletedCustomers, // returning under "customers" key
    });

  } catch (error) {
    console.error('Error fetching deleted customers:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching deleted customers',
      error: error.message,
    });
  }
};



// ✅ Restore (Undo Delete) Customer and all their deleted shipments
 exports.restoreCustomer = async (req, res) => {
  try {
    const loggedInAdminId = req.admin?._id;

    // 🔒 Admin authorization check
    if (!loggedInAdminId) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const id = req.params.id;

    // Find customer owned by this admin
    const customer = await Customer.findOneAndUpdate(
      { _id: id, admin: loggedInAdminId, isDeleted: true }, // ownership + deleted
      { isDeleted: false },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found or you are not authorized to restore it',
      });
    }

    // Restore all soft-deleted shipments for this customer **created by this admin**
    await Shipment.updateMany(
      { customer: id, admin: loggedInAdminId, isDeleted: true },
      { $set: { isDeleted: false } }
    );

    res.status(200).json({
      success: true,
      message: 'Customer restored successfully',
      customer
    });

  } catch (error) {
    console.error('Error restoring customer:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while restoring customer',
      error: error.message
    });
  }
};
