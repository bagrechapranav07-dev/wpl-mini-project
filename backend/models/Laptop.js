const mongoose = require("mongoose");

const laptopSchema = new mongoose.Schema(
  {
    productId: { type: Number, required: true, unique: true }, // numeric id used by the storefront
    name: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    processor: { type: String, required: true },
    processorSeries: { type: String, required: true },
    ram: { type: String, required: true },        // display label, e.g. "16GB RAM"
    ramNum: { type: Number, required: true },      // numeric GB, used for filtering
    storage: { type: String, required: true },     // display label, e.g. "512GB SSD"
    storageNum: { type: Number, required: true },  // numeric GB, used for filtering
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, required: true, min: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewsCount: { type: Number, default: 0 },
    category: {
      type: String,
      required: true,
      enum: ["Ultrabook", "Professional", "Business", "Gaming", "Student"]
    },
    displaySize: { type: String, required: true },
    os: { type: String, required: true },
    badge: { type: String },
    description: { type: String },
    image: { type: String },
    stock: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true } // false = removed from storefront, restorable by admin
  },
  { timestamps: true }
);

module.exports = mongoose.model("Laptop", laptopSchema);
