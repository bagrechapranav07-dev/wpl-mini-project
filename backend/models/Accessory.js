const mongoose = require("mongoose");

const accessorySchema = new mongoose.Schema(
  {
    productId: { type: Number, required: true, unique: true }, // numeric id used by the storefront
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, required: true, min: 0 },
    category: {
      type: String,
      required: true,
      enum: ["Peripherals", "Adapters", "Storage", "Stands", "Audio", "Cooling", "Bags"]
    },
    brand: { type: String, required: true, trim: true },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewsCount: { type: Number, default: 0 },
    image: { type: String },
    stock: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Accessory", accessorySchema);
