const mongoose = require("mongoose");
const Admin = require("../model/admin");

// ===== CREATE ADMIN =====
exports.createAdmin = async (req, res, next) => {
  const {
    fullName,
    email,
    password,
  } = req.body;

  const admin = new Admin({
    fullName: fullName,
    email: email,
    password: password,
  });

  try {
    const adminEmail = await Admin.findOne({ email: email });

    if (adminEmail) {
      return res.status(401).json({
        message: "E-mail exists already, please pick a different one.",
      });
    }

    const saveAdmin = await admin.save();
    const token = await admin.generateAuthToken();
    console.log('Admin created:', saveAdmin);

    res.status(200).json({ 
      message: `Hello ${saveAdmin.fullName} thanks for joining us, kindly log into your account`,
      success: true,
      admin: saveAdmin,
      token: token
    });
  } catch (error) {
    console.log('Create admin error:', error);
    res.status(500).json({ message: 'Error creating admin', error: error.message });
  }
};

// ===== LOGIN ADMIN =====
exports.loginAdmin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required.' 
      });
    }

    // Try to find admin
    let admin;
    try {
      admin = await Admin.findByCredentials(email, password);
    } catch (err) {
      console.error('findByCredentials error:', err.message);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password.' 
      });
    }

    if (!admin) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password.' 
      });
    }

    if (admin.isBlocked) {
      return res.status(403).json({ 
        success: false, 
        message: `Hello ${admin.fullName}, your account is blocked. Please contact the system administrator.` 
      });
    }

    let token;
    try {
      token = await admin.generateAuthToken();
    } catch (err) {
      console.error('Token generation error:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Error generating token'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      admin,
      token
    });

  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// ===== LOGOUT ADMIN =====
exports.logoutAdmin = async (req, res, next) => {
  try {
    req.admin.tokens = req.admin.tokens.filter((token) => {
      return token.token !== req.token;
    });
    await req.admin.save();

    res.send("Logged out successfully");
  } catch (e) {
    res.status(500).send(e);
  }
};



// ===== RESET PASSWORD =====
exports.postReset = async (req, res, next) => {
  const email = req.body.email;
  try {
    const admin = await Admin.findOne({ email });
    res.status(200).send({
      success: true,
      message: "Reset email sent",
      adminId: admin._id,
    });
  } catch (error) {
    res.status(500).send(error);
  }
};

// ===== GET NEW PASSWORD PAGE =====
exports.getNewPassword = async (req, res, next) => {
  const token = req.params.token;
  try {
    const admin = await Admin.findOne();
    res.status(200).json({
      success: true,
      adminId: admin._id,
    });
  } catch (error) {
    res.status(500).send(error);
  }
};

// ===== POST NEW PASSWORD =====
exports.postNewPassword = async (req, res, next) => {
  const newPassword = req.body.password;
  const adminId = req.body.adminId;

  try {
    const admin = await Admin.findOne({ _id: adminId });

    if (!admin) {
      res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }
    admin.password = newPassword;
    await admin.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error,
    });
  }
};
