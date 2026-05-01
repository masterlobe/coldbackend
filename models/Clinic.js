const mongoose = require("mongoose");

const clinicSchema = new mongoose.Schema({
  name: String,
  phone: String,
  status: {
    type: String,
    default: "not_contacted"
  },
  rating: Number,
  review_count: String,
  city: String,
  note: {
    type: String,
    default: ""
  }
}, { timestamps: true });

module.exports = mongoose.model("Clinic", clinicSchema);
