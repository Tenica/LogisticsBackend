const mongoose = require("mongoose");
const validator = require("validator");
const jwt = require("jsonwebtoken");
const Schema = mongoose.Schema;

const adminSchema = new Schema({
fullName: {
    type: String,
    required: [true, "A first name is required"],
    trim: true,
  },
  email: {
    type: String,
    required: [true, "A valid email is required"],
    unique: true,
    trim: true,
    validate(value) {
      if (!validator.isEmail(value)) {
        throw new Error("Email is invalid");
      }
    },
  },
  password: {
    type: String,
    required: [true, "A password is required"],
    validate(value) {
      if (!validator.isStrongPassword(value)) {
        throw new Error("Password be more than 6 and include characters");
      }
    },
  },
  resetToken: String,
  resetTokenExpiration: Date,
  isAdmin: {
    type: Boolean,
    default: false
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  tokens: [
    {
      token: {
        type: String,
        required: true,
      },
    },
  ],

   timestamp: { type: Date, default: Date.now }
});

// Virtual field: link Admin → Customers they created
adminSchema.virtual("customers", {
  ref: "Customer",
  localField: "_id",
  foreignField: "createdBy"
});;



adminSchema.methods.toJSON = function () {
  const admin = this;
  const adminObject = admin.toObject();

  delete adminObject.tokens;

  return adminObject;
};

adminSchema.methods.generateAuthToken = async function () {
  const admin = this;
  console.log("user", admin);
  const token = jwt.sign(
    {
      _id: admin._id.toString(),
    },
    process.env.JSON_SECRET_KEY,
    { expiresIn: "1h" }
  );
  console.log(admin._id);

  admin.tokens = admin.tokens.concat({ token });
  await admin.save();

  return token;
};

adminSchema.statics.findByCredentials = async (email, password) => {
  let admin;
  try {
    admin = await Admin.findOne({ email, password });
    if (!admin) {
      console.log("Unable to login");
    }
  } catch (error) {
   console.log(error)
  }
  return admin;
};





const Admin = mongoose.model("Admin", adminSchema);
module.exports = Admin;
