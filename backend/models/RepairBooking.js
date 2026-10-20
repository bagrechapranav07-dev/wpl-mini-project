const mongoose = require("mongoose");

const repairBookingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    laptopModel: { type: String, required: true, trim: true },
    issueType: { type: String, required: true, trim: true },
    description: { type: String },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed"],
      default: "Pending"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("RepairBooking", repairBookingSchema);
