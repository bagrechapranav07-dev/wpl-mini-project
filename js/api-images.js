/**
 * TechNest - Dynamic API Image Loading Module
 * Fetches product images dynamically via HTTP fetch calls to public APIs
 * (DummyJSON & Unsplash) instead of using hardcoded local images.
 */

const API_IMAGE_CACHE_KEY = "technest_api_image_cache_v5";

// Clear out old cache versions (earlier providers, and v4 which always cached the
// first search result — causing several laptops to share one duplicate photo)
["technest_api_image_cache_v1", "technest_api_image_cache_v2", "technest_api_image_cache_v3", "technest_api_image_cache_v4"].forEach(oldKey => {
  try { localStorage.removeItem(oldKey); } catch (e) {}
});

// Paste your free Unsplash "Access Key" here (get one at https://unsplash.com/developers)
const UNSPLASH_ACCESS_KEY = "S7-Q6GrlaKj5pGfZ4emykFRPUu0ao_knhd1EomuuAnE";

// Helper to retrieve cached API images from sessionStorage/localStorage
function getApiImageCache() {
  try {
    const cached = localStorage.getItem(API_IMAGE_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch (e) {
    return {};
  }
}

// Helper to save image URL into cache
function cacheApiImage(key, url) {
  try {
    const cache = getApiImageCache();
    cache[key] = url;
    localStorage.setItem(API_IMAGE_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn("Could not write to image cache", e);
  }
}

// Real laptop brands Unsplash reliably has stock photos for
const KNOWN_LAPTOP_BRANDS = ["Apple", "Dell", "HP", "Lenovo", "ASUS", "Acer", "MSI"];

// Laptop category -> a search term guaranteed to return real laptop photos
const LAPTOP_CATEGORY_QUERY = {
  Gaming: "gaming laptop",
  Ultrabook: "ultrabook laptop",
  Business: "business laptop",
  Professional: "professional laptop",
  Student: "student laptop"
};

// Accessory category -> a specific, reliable search term (avoids brand names like "TechNest")
const ACCESSORY_CATEGORY_QUERY = {
  Peripherals: "computer peripherals",
  Adapters: "usb hub adapter",
  Storage: "nvme ssd drive",
  Stands: "aluminum laptop stand",
  Audio: "wireless headphones",
  Cooling: "laptop cooling pad",
  Bags: "laptop backpack"
};

// Build a search query that reliably returns an on-topic photo instead of the exact (often fictional) product name
function buildImageSearchQuery(item) {
  const isLaptop = !!item.ram; // laptops carry a `ram` field, accessories don't

  if (isLaptop) {
    if (KNOWN_LAPTOP_BRANDS.includes(item.brand)) {
      return `${item.brand} laptop`;
    }
    return LAPTOP_CATEGORY_QUERY[item.category] || "laptop computer";
  }

  if (item.name && /mouse/i.test(item.name)) return "wireless mouse";
  if (item.name && /keyboard/i.test(item.name)) return "mechanical keyboard";
  return ACCESSORY_CATEGORY_QUERY[item.category] || "computer accessory";
}

/**
 * Dynamic API fetch for laptop image
 * Queries live API endpoints (DummyJSON laptop endpoint or Unsplash public API)
 */
async function fetchProductImageFromAPI(laptopItem) {
  // Admin-set custom image (URL or uploaded photo) always wins over the auto-fetched one
  try {
    const imageOverrides = JSON.parse(localStorage.getItem("technest_image_overrides") || "{}");
    if (imageOverrides[laptopItem.id]) {
      return imageOverrides[laptopItem.id];
    }
  } catch (e) {}

  const cacheKey = `laptop_${laptopItem.id}_${laptopItem.name.replace(/\s+/g, '_')}`;
  const cache = getApiImageCache();

  if (cache[cacheKey]) {
    return cache[cacheKey];
  }

  // Fallback high quality API image URLs if API network is slow or offline
  const fallbackApiUrls = [
    "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80", // Macbook/Pro
    "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80", // Ultrabook
    "https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=800&q=80", // Gaming
    "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=800&q=80", // Modern Laptop
    "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=800&q=80", // Metallic Laptop
    "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=80", // Studio Laptop
    "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=800&q=80", // Dell XPS style
    "https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=800&q=80"  // Tech Workstation
  ];

  // 1. Try fetching a real matching photo from the Unsplash Search API (requires an Access Key)
  if (UNSPLASH_ACCESS_KEY && UNSPLASH_ACCESS_KEY !== "YOUR_UNSPLASH_ACCESS_KEY_HERE") {
    try {
      const searchQuery = encodeURIComponent(buildImageSearchQuery(laptopItem));
      // Fetch several candidates per query (not just 1) — several laptops in the same
      // brand/category can share a search term, so picking a different result per
      // laptop (by id) keeps each one visually distinct instead of all showing photo #1.
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${searchQuery}&per_page=10&orientation=squarish`,
        { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } }
      );

      if (response.ok) {
        const data = await response.json();
        const results = data.results || [];
        const photo = results.length ? results[laptopItem.id % results.length] : null;
        if (photo && photo.urls && photo.urls.regular) {
          cacheApiImage(cacheKey, photo.urls.regular);
          return photo.urls.regular;
        }
      } else {
        console.warn("Unsplash API request failed:", response.status, response.statusText);
      }
    } catch (err) {
      console.warn("Unsplash API fetch error, falling back to static images:", err);
    }
  }

  // 2. Fallback to bundled Unsplash image URLs when no key is set or the API call fails
  const index = (laptopItem.id - 1) % fallbackApiUrls.length;
  const chosenApiUrl = fallbackApiUrls[index];
  cacheApiImage(cacheKey, chosenApiUrl);
  return chosenApiUrl;
}

/**
 * Bulk API Fetch for catalogue rendering
 */
async function loadDynamicApiImagesForLaptops(laptopsList, callbackOnItemLoaded) {
  for (const laptop of laptopsList) {
    fetchProductImageFromAPI(laptop).then(apiUrl => {
      laptop.apiImage = apiUrl;
      if (typeof callbackOnItemLoaded === "function") {
        callbackOnItemLoaded(laptop, apiUrl);
      }
    });
  }
}
