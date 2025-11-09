const mongoose = require("mongoose");
const Admin = require("../model/admin");
const isAuth = require("../middleware/is-auth");


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
      res
        .status(401)
        .json({
          message: "E-mail exists already, please pick a different one.",
        });
    }  else {
      const saveAdmin = await admin.save();
      const getUserToken = await admin.generateAuthToken();
      console.log(saveAdmin);
    
      res.status(200).json({ message: `Hello ${saveAdmin.fullName} thanks for joining us, kindly log into your account`});
      
    }
  } catch (error) {
    console.log(error);
    res.status(404).json({ message: error });
  }
};


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

    const admin = await Admin.findByCredentials(email, password);
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

    const token = await admin.generateAuthToken();

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      admin,
      token
    });
    
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An internal server error occurred while trying to log in.', 
      error: error.message 
    });
  }
};



exports.logoutAdmin = async (req, res, next) => {
  try {
    // Filter out the current token (logout from current session only)
    req.admin.tokens = req.admin.tokens.filter((token) => token.token !== req.token);
    await req.admin.save();

    res.status(200).json({
      success: true,
      message: `Logout successful for ${req.admin.fullName || 'Admin'}.`
    });
  } catch (error) {
    console.error('Logout Error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while logging out. Please try again later.',
      error: error.message
    });
  }
};



exports.postReset =  (req, res, next) => {
 const encryptPassword =  crypto.randomBytes(32, async (err, buffer) => {
    if (err) {
      console.log(err);
      return res.status(500).send(err);
    }
    const passToken = buffer.toString("hex");
    const findUser = await Admin.findOne({ email: req.body.email })
    try {
      if (!findUser) {
        res.status(400).json({ message: "No account" });
      } else {
        findUser.resetToken = passToken;
        findUser.resetTokenExpiration = Date.now() + 3600000;
        const result = await findUser.save();
         passwordResetEmail(result.fullName, result.resetToken, result.email)
         console.log(req.body.email, result);
         res.status(200).json({ message: `${findUser.firstName}, kindly check your email to continue`});
      }
    } catch (error) {
      console.log(error);
    }
  });
};

exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;
  Admin.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } })
    .then((user) => {
      res
        .status(200)
        .json({ userId: user._id.toString(), passwordToken: token });
    })
    .catch((err) => {
      console.log(err);
    });
};

exports.postNewPassword = async (req, res, next) => {
  const token = req.params.token;
  const newPassword = req.body.password;
  // const userId = req.body.userId;
  // const passwordToken = req.body.passwordToken;
  // console.log(passwordToken);
  let resetUser;

  try {
    const result = await Admin.findOne({
      resetToken: token,
      resetTokenExpiration: { $gt: Date.now() }
      // _id: userId,
    })
   
    if(result) {
      resetUser = result;
      resetUser.password = newPassword;
      resetUser.resetToken = undefined;
      resetUser.resetTokenExpiration = undefined;
      const saveResult = await resetUser.save();
      return res.status(200).json({message: `Password successfully set`})
    } else {
      res.status(400).json({message: "user not found"})
    }
  } catch (error) {
     res.status(402).json({message: error})
  }
};



