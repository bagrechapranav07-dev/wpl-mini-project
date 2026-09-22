const mongoose = require("mongoose");
const addressSchema = require("./Address");

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: "items.productType" },
    productType: { type: String, required: true, enum: ["Laptop", "Accessory"] },
    name: { type: String, required: true },   // snapshot at time of purchase
    price: { type: Number, required: true },  // snapshot at time of purchase
    qty: { type: Number, required: true, min: 1 }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true }, // e.g. "TN-894201"
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // null/absent for guest checkout
    customerName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    shippingAddress: { type: addressSchema, required: true },
    items: { type: [orderItemSchema], required: true, validate: v => v.length > 0 },
    paymentMethod: {
      type: String,
      required: true,
      enum: ["UPI / QR Code", "Credit / Debit Card", "Net Banking", "Cash on Delivery"]
    },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["Processing", "Shipped", "Delivered", "Cancelled"],
      default: "Processing"
    },
    notes: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
