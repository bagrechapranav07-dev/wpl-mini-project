require("dotenv").config();
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const { Laptop, Accessory, Admin } = require("./models");

// Load the catalogue from the frontend's js/data.js so there's a single source of truth
function loadFrontendCatalogue() {
  const code = fs.readFileSync(path.join(__dirname, "..", "js", "data.js"), "utf8");
  const sandbox = { localStorage: { getItem: () => null }, console };
  vm.runInNewContext(`${code}\nthis.__out = { LAPTOPS: LAPTOPS_SEED, ACCESSORIES };`, sandbox);
  return sandbox.__out;
}

async function seed() {
  await connectDB();
  const { LAPTOPS, ACCESSORIES } = loadFrontendCatalogue();
  const strip = ({ id, formattedPrice, ...rest }) => ({ ...rest, productId: id, stock: 10 });

  await Laptop.deleteMany({});
  await Accessory.deleteMany({});
  await Laptop.insertMany(LAPTOPS.map(strip));
  await Accessory.insertMany(ACCESSORIES.map(strip));

  const hash = await bcrypt.hash("admin123", 10);
  await Admin.updateOne({ username: "admin" }, { username: "admin", password: hash }, { upsert: true });

  console.log(`Seeded ${LAPTOPS.length} laptops, ${ACCESSORIES.length} accessories, admin user "admin"`);
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
