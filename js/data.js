// TechNest Detailed Laptops Dataset with Smart Filter Attributes

const LAPTOPS = [
  {
    id: 1,
    name: "Apple MacBook Air M2",
    brand: "Apple",
    processor: "Apple M2",
    processorSeries: "Apple M Series",
    ram: "8GB RAM",
    ramNum: 8,
    storage: "256GB SSD",
    storageNum: 256,
    price: 84900,
    originalPrice: 99900,
    rating: 4.8,
    reviewsCount: 1420,
    category: "Ultrabook",
    displaySize: '13.6"',
    os: "macOS",
    badge: "TechNest Choice",
    description: "Incredibly thin liquid retina display, silent fanless design, up to 18 hours battery life."
  },
  {
    id: 2,
    name: "Dell XPS 13 9315",
    brand: "Dell",
    processor: "Intel Core i7",
    processorSeries: "Intel Core i7",
    ram: "16GB RAM",
    ramNum: 16,
    storage: "512GB SSD",
    storageNum: 512,
    price: 94990,
    originalPrice: 112000,
    rating: 4.5,
    reviewsCount: 630,
    category: "Professional",
    displaySize: '13.4"',
    os: "Windows 11",
    badge: "Best Seller",
    description: "InfinityEdge FHD+ screen, aluminum CNC chassis, top tier lightweight performance."
  },
  {
    id: 3,
    name: "HP Pavilion 15 Core i5",
    brand: "HP",
    processor: "Intel Core i5",
    processorSeries: "Intel Core i5",
    ram: "16GB RAM",
    ramNum: 16,
    storage: "512GB SSD",
    storageNum: 512,
    price: 56990,
    originalPrice: 68500,
    rating: 4.4,
    reviewsCount: 890,
    category: "Business",
    displaySize: '15.6"',
    os: "Windows 11",
    badge: "Limited Deal",
    description: "Bang & Olufsen audio, backlit keyboard, fast charge battery for all-day office tasks."
  },
  {
    id: 4,
    name: "ASUS ROG Strix G16 Gaming",
    brand: "ASUS",
    processor: "Intel Core i7",
    processorSeries: "Intel Core i7",
    ram: "16GB RAM",
    ramNum: 16,
    storage: "1TB SSD",
    storageNum: 1000,
    price: 114990,
    originalPrice: 139900,
    rating: 4.7,
    reviewsCount: 412,
    category: "Gaming",
    displaySize: '16"',
    os: "Windows 11",
    badge: "Top Rated",
    description: "NVIDIA RTX 4060 GPU, 165Hz FHD+ display, Tri-Fan cooling technology for hard gaming."
  },
  {
    id: 5,
    name: "Lenovo IdeaPad Slim 3",
    brand: "Lenovo",
    processor: "Intel Core i3",
    processorSeries: "Intel Core i3",
    ram: "8GB RAM",
    ramNum: 8,
    storage: "512GB SSD",
    storageNum: 512,
    price: 36990,
    originalPrice: 48990,
    rating: 4.2,
    reviewsCount: 1150,
    category: "Student",
    displaySize: '15.6"',
    os: "Windows 11",
    badge: "Budget King",
    description: "Anti-glare display, privacy camera shutter, lightweight laptop ideal for student studies."
  },
  {
    id: 6,
    name: "Acer Nitro 5 Ryzen 7",
    brand: "Acer",
    processor: "AMD Ryzen 7",
    processorSeries: "AMD Ryzen 7",
    ram: "16GB RAM",
    ramNum: 16,
    storage: "512GB SSD",
    storageNum: 512,
    price: 74990,
    originalPrice: 89990,
    rating: 4.5,
    reviewsCount: 975,
    category: "Gaming",
    displaySize: '15.6"',
    os: "Windows 11",
    badge: "TechNest Choice",
    description: "NVIDIA RTX 3050 GPU, dual fan cooling with NitroSense control panel, 144Hz screen."
  },
  {
    id: 7,
    name: "Apple MacBook Pro 14 M3",
    brand: "Apple",
    processor: "Apple M3",
    processorSeries: "Apple M Series",
    ram: "18GB RAM",
    ramNum: 18,
    storage: "512GB SSD",
    storageNum: 512,
    price: 169900,
    originalPrice: 179900,
    rating: 4.9,
    reviewsCount: 310,
    category: "Professional",
    displaySize: '14.2"',
    os: "macOS",
    badge: "Pro Choice",
    description: "Liquid Retina XDR display, hardware ray tracing, spatial audio 6-speaker system."
  },
  {
    id: 8,
    name: "MSI Thin GF63 Gaming",
    brand: "MSI",
    processor: "Intel Core i5",
    processorSeries: "Intel Core i5",
    ram: "16GB RAM",
    ramNum: 16,
    storage: "512GB SSD",
    storageNum: 512,
    price: 52990,
    originalPrice: 65990,
    rating: 4.3,
    reviewsCount: 540,
    category: "Gaming",
    displaySize: '15.6"',
    os: "Windows 11",
    badge: "Value Gaming",
    description: "Aluminum hair-brushed aesthetics, 144Hz IPS level screen, dedicated GTX graphics."
  },
  {
    id: 9,
    name: "Lenovo ThinkPad E14 Gen 5",
    brand: "Lenovo",
    processor: "AMD Ryzen 5",
    processorSeries: "AMD Ryzen 5",
    ram: "16GB RAM",
    ramNum: 16,
    storage: "512GB SSD",
    storageNum: 512,
    price: 58990,
    originalPrice: 72900,
    rating: 4.6,
    reviewsCount: 780,
    category: "Business",
    displaySize: '14"',
    os: "Windows 11",
    badge: "Enterprise Standard",
    description: "MIL-STD-810H durability standard, TrackPoint navigation, fingerprint security."
  },
  {
    id: 10,
    name: "TechNest Creator Book 16",
    brand: "TechNest",
    processor: "Intel Core i9",
    processorSeries: "Intel Core i9",
    ram: "32GB RAM",
    ramNum: 32,
    storage: "1TB SSD",
    storageNum: 1000,
    price: 129990,
    originalPrice: 149990,
    rating: 4.8,
    reviewsCount: 185,
    category: "Professional",
    displaySize: '16"',
    os: "Windows 11",
    badge: "Store Flagship",
    description: "4K OLED 100% DCI-P3 color display designed for 4K video rendering & 3D modeling."
  },
  {
    id: 11,
    name: "HP Victus Gaming 15",
    brand: "HP",
    processor: "AMD Ryzen 5",
    processorSeries: "AMD Ryzen 5",
    ram: "8GB RAM",
    ramNum: 8,
    storage: "512GB SSD",
    storageNum: 512,
    price: 49990,
    originalPrice: 62000,
    rating: 4.3,
    reviewsCount: 1230,
    category: "Gaming",
    displaySize: '15.6"',
    os: "Windows 11",
    badge: "Popular",
    description: "OMEN Gaming Hub integrated, 144Hz refresh rate, AMD SmartShift graphics power."
  },
  {
    id: 12,
    name: "Dell Inspiron 14 2-in-1",
    brand: "Dell",
    processor: "Intel Core i5",
    processorSeries: "Intel Core i5",
    ram: "16GB RAM",
    ramNum: 16,
    storage: "512GB SSD",
    storageNum: 512,
    price: 67990,
    originalPrice: 79990,
    rating: 4.5,
    reviewsCount: 490,
    category: "Ultrabook",
    displaySize: '14"',
    os: "Windows 11",
    badge: "Touch & Flip",
    description: "360-degree hinge convertible touch screen with active pen stylus support."
  }
];

// Pristine snapshot of the full seed catalogue, captured before any admin edits are applied.
// Used to reset pricing to default and to restore a deleted laptop.
const LAPTOPS_SEED = LAPTOPS.map(l => ({ ...l }));
const LAPTOPS_DEFAULT_PRICING = LAPTOPS_SEED.map(l => ({ id: l.id, price: l.price, originalPrice: l.originalPrice }));

// Append any laptops the admin has added (from localStorage) on top of the seed data.
// Runs before price overrides so a custom laptop's price/discount edits also apply.
// New laptops are stored under ids >= 1000 so they never collide with the seed catalogue.
(function appendStoredCustomLaptops() {
  try {
    const customLaptops = JSON.parse(localStorage.getItem("technest_custom_laptops") || "[]");
    customLaptops.forEach(laptop => {
      if (!LAPTOPS.find(l => l.id === laptop.id)) {
        LAPTOPS.push(laptop);
      }
    });
  } catch (e) {
    console.warn("Could not load admin-added laptops:", e);
  }
})();

// Apply any admin-saved price/discount overrides (from localStorage) on top of the seed data.
// Runs immediately on every page load, before any rendering happens, so every page that
// reads LAPTOPS (home, catalogue, cart, checkout) automatically reflects admin pricing changes.
(function applyStoredLaptopPriceOverrides() {
  try {
    const overrides = JSON.parse(localStorage.getItem("technest_price_overrides") || "{}");
    LAPTOPS.forEach(laptop => {
      const o = overrides[laptop.id];
      if (o) {
        if (typeof o.price === "number") laptop.price = o.price;
        if (typeof o.originalPrice === "number") laptop.originalPrice = o.originalPrice;
      }
    });
  } catch (e) {
    console.warn("Could not apply stored laptop price overrides:", e);
  }
})();

// Remove any laptops the admin has deleted (from localStorage) on top of the seed data.
// Runs on every page load, so a deletion from the admin dashboard disappears from the
// home page and catalogue for every visitor on this browser.
(function applyStoredLaptopDeletions() {
  try {
    const deletedIds = JSON.parse(localStorage.getItem("technest_deleted_laptops") || "[]");
    if (deletedIds.length) {
      for (let i = LAPTOPS.length - 1; i >= 0; i--) {
        if (deletedIds.includes(LAPTOPS[i].id)) LAPTOPS.splice(i, 1);
      }
    }
  } catch (e) {
    console.warn("Could not apply stored laptop deletions:", e);
  }
})();

const ACCESSORIES = [
  { id: 101, name: "Wireless Ergonomic Mouse", price: 899, formattedPrice: "₹899", originalPrice: 1499, category: "Peripherals", brand: "TechNest", rating: 4.5, reviewsCount: 320 },
  { id: 102, name: "RGB Mechanical Keyboard", price: 2499, formattedPrice: "₹2,499", originalPrice: 3999, category: "Peripherals", brand: "TechNest", rating: 4.7, reviewsCount: 512 },
  { id: 103, name: "USB-C Multiport Adapter Hub", price: 1299, formattedPrice: "₹1,299", originalPrice: 1999, category: "Adapters", brand: "TechNest", rating: 4.4, reviewsCount: 198 },
  { id: 104, name: "Portable NVMe 1TB SSD", price: 6499, formattedPrice: "₹6,499", originalPrice: 8999, category: "Storage", brand: "SanDisk", rating: 4.8, reviewsCount: 840 },
  { id: 105, name: "Adjustable Aluminum Stand", price: 1199, formattedPrice: "₹1,199", originalPrice: 1799, category: "Stands", brand: "TechNest", rating: 4.6, reviewsCount: 430 },
  { id: 106, name: "Noise Cancelling Headset", price: 1899, formattedPrice: "₹1,899", originalPrice: 2999, category: "Audio", brand: "Sony", rating: 4.5, reviewsCount: 670 },
  { id: 107, name: "Dual-Fan Laptop Cooling Pad", price: 1499, formattedPrice: "₹1,499", originalPrice: 2199, category: "Cooling", brand: "TechNest", rating: 4.3, reviewsCount: 290 },
  { id: 108, name: "Water Resistant Laptop Bag", price: 1599, formattedPrice: "₹1,599", originalPrice: 2499, category: "Bags", brand: "TechNest", rating: 4.6, reviewsCount: 910 }
];

// Helper to format currency in Indian format (₹)
function formatINR(amount) {
  return "₹" + Number(amount).toLocaleString("en-IN");
}
