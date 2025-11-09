const mongoose = require("mongoose");
const validator = require("validator");
const Schema = mongoose.Schema;

const customerSchema = new Schema({
fullName: {
    type: String,
    required: [true, "A first name is required"],
    trim: true,
  },
  phone: { 
    type: String,
     required: true 
    },
  email: {
    type: String,
    required: [true, "A valid email is required"],
    unique: true,
    sparse: true ,
    trim: true,
    validate(value) {
      if (!validator.isEmail(value)) {
        throw new Error("Email is invalid");
      }
    },
  },
  address: { type: String },
  city: { type: String },
  country: { type: String, default: 'enter country'
   },
   isDeleted: {
     type: Boolean,
     default: false
   },
   createdBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Admin",
  required: true
}
}, {
    timestamps: true,
    get: (time) => time.toDateString(),
  });




const Customer = mongoose.model("Customer", customerSchema);
module.exports = Customer;


