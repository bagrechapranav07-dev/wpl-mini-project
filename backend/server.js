require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const connectDB = require("./config/db");
const { Laptop, Accessory, Order, ContactMessage, RepairBooking, Admin } = require("./models");

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

// Wraps async handlers so rejected promises reach the error middleware
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

// Generic CRUD routes for a model, addressed by _id
function crud(Model) {
  const router = express.Router();
  router.get("/", wrap(async (req, res) => res.json(await Model.find().sort({ createdAt: -1 }))));
  router.get("/:id", wrap(async (req, res) => {
    const doc = await Model.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  }));
  router.post("/", wrap(async (req, res) => res.status(201).json(await Model.create(req.body))));
  router.patch("/:id", wrap(async (req, res) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  }));
  router.delete("/:id", wrap(async (req, res) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json({ deleted: true });
  }));
  return router;
}

// Catalogue routes, addressed by the numeric productId the storefront uses.
// Laptops with isActive=false are hidden unless ?all=1 is passed (admin "removed" list).
function catalogue(Model) {
  const router = express.Router();
  router.get("/", wrap(async (req, res) => {
    const filter = req.query.all ? {} : { isActive: { $ne: false } };
    res.json(await Model.find(filter).sort({ productId: 1 }));
  }));
  router.post("/", wrap(async (req, res) => {
    // Admin-added products get ids >= 1000 so they never collide with the seed catalogue
    const last = await Model.findOne({ productId: { $gte: 1000 } }).sort({ productId: -1 });
    const productId = last ? last.productId + 1 : 1000;
    res.status(201).json(await Model.create({ ...req.body, productId }));
  }));
  router.patch("/:productId", wrap(async (req, res) => {
    const { productId, _id, ...update } = req.body || {};
    const doc = await Model.findOneAndUpdate({ productId: Number(req.params.productId) }, update, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  }));
  router.delete("/:productId", wrap(async (req, res) => {
    const doc = await Model.findOneAndDelete({ productId: Number(req.params.productId) });
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json({ deleted: true });
  }));
  return router;
}

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/laptops", catalogue(Laptop));
app.use("/api/accessories", catalogue(Accessory));
app.use("/api/orders", crud(Order));
app.use("/api/contact", crud(ContactMessage));
app.use("/api/repairs", crud(RepairBooking));

app.post("/api/admin/login", wrap(async (req, res) => {
  const { username, password } = req.body || {};
  const admin = await Admin.findOne({ username }).select("+password");
  if (!admin || !(await bcrypt.compare(password || "", admin.password))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  res.json({ success: true, username: admin.username });
}));

// Serve the static frontend from the project root
app.use(express.static(path.join(__dirname, "..")));

app.use((err, req, res, next) => {
  const status = err.name === "ValidationError" || err.name === "CastError" ? 400 : 500;
  res.status(status).json({ error: err.message });
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`)))
  .catch(err => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
