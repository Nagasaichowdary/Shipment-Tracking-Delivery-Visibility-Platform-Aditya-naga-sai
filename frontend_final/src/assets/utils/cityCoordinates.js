/**
 * cityCoordinates.js
 *
 * Static lookup table for common Indian cities.
 * Eliminates the dependency on Google Geocoding API (which requires billing).
 *
 * Usage:
 *   import { getCityCoordinates } from "../utils/cityCoordinates";
 *   const coords = getCityCoordinates("delhi"); // { lat: 28.6139, lng: 77.2090 }
 *   if (!coords) { /* city not in table *\/ }
 *
 * Rules:
 *   - Lookup is case-insensitive and trims surrounding whitespace.
 *   - Aliases are normalised to a canonical key before lookup.
 *   - Returns null when city is not found — do NOT fall back to Geocoding API.
 */

// ── Canonical city table ─────────────────────────────────────────────────────
// Coordinates are city-centre approximations suitable for map markers.
const CITY_COORDS = {
  // North India
  "delhi":           { lat: 28.6139,  lng: 77.2090  },
  "new delhi":       { lat: 28.6139,  lng: 77.2090  },
  "noida":           { lat: 28.5355,  lng: 77.3910  },
  "gurgaon":         { lat: 28.4595,  lng: 77.0266  },
  "gurugram":        { lat: 28.4595,  lng: 77.0266  },
  "faridabad":       { lat: 28.4082,  lng: 77.3178  },
  "ghaziabad":       { lat: 28.6692,  lng: 77.4538  },
  "agra":            { lat: 27.1767,  lng: 78.0081  },
  "lucknow":         { lat: 26.8467,  lng: 80.9462  },
  "kanpur":          { lat: 26.4499,  lng: 80.3319  },
  "varanasi":        { lat: 25.3176,  lng: 82.9739  },
  "prayagraj":       { lat: 25.4358,  lng: 81.8463  },
  "allahabad":       { lat: 25.4358,  lng: 81.8463  },
  "meerut":          { lat: 28.9845,  lng: 77.7064  },
  "jaipur":          { lat: 26.9124,  lng: 75.7873  },
  "jodhpur":         { lat: 26.2389,  lng: 73.0243  },
  "udaipur":         { lat: 24.5854,  lng: 73.7125  },
  "kota":            { lat: 25.2138,  lng: 75.8648  },
  "ajmer":           { lat: 26.4499,  lng: 74.6399  },
  "chandigarh":      { lat: 30.7333,  lng: 76.7794  },
  "amritsar":        { lat: 31.6340,  lng: 74.8723  },
  "ludhiana":        { lat: 30.9010,  lng: 75.8573  },
  "shimla":          { lat: 31.1048,  lng: 77.1734  },
  "dehradun":        { lat: 30.3165,  lng: 78.0322  },

  // West India
  "mumbai":          { lat: 19.0760,  lng: 72.8777  },
  "pune":            { lat: 18.5204,  lng: 73.8567  },
  "nagpur":          { lat: 21.1458,  lng: 79.0882  },
  "nashik":          { lat: 19.9975,  lng: 73.7898  },
  "aurangabad":      { lat: 19.8762,  lng: 75.3433  },
  "solapur":         { lat: 17.6805,  lng: 75.9064  },
  "kolhapur":        { lat: 16.7050,  lng: 74.2433  },
  "ahmedabad":       { lat: 23.0225,  lng: 72.5714  },
  "surat":           { lat: 21.1702,  lng: 72.8311  },
  "vadodara":        { lat: 22.3072,  lng: 73.1812  },
  "rajkot":          { lat: 22.3039,  lng: 70.8022  },
  "gandhinagar":     { lat: 23.2156,  lng: 72.6369  },
  "goa":             { lat: 15.2993,  lng: 74.1240  },
  "panaji":          { lat: 15.4989,  lng: 73.8278  },

  // South India
  "chennai":         { lat: 13.0827,  lng: 80.2707  },
  "madras":          { lat: 13.0827,  lng: 80.2707  },
  "bengaluru":       { lat: 12.9716,  lng: 77.5946  },
  "bangalore":       { lat: 12.9716,  lng: 77.5946  },
  "hyderabad":       { lat: 17.3850,  lng: 78.4867  },
  "secunderabad":    { lat: 17.4399,  lng: 78.4983  },
  "coimbatore":      { lat: 11.0168,  lng: 76.9558  },
  "madurai":         { lat: 9.9252,   lng: 78.1198  },
  "tiruchirappalli": { lat: 10.7905,  lng: 78.7047  },
  "trichy":          { lat: 10.7905,  lng: 78.7047  },
  "salem":           { lat: 11.6643,  lng: 78.1460  },
  "tirunelveli":     { lat: 8.7139,   lng: 77.7567  },
  "vellore":         { lat: 12.9165,  lng: 79.1325  },
  "kochi":           { lat: 9.9312,   lng: 76.2673  },
  "cochin":          { lat: 9.9312,   lng: 76.2673  },
  "thiruvananthapuram": { lat: 8.5241, lng: 76.9366 },
  "trivandrum":      { lat: 8.5241,   lng: 76.9366  },
  "kozhikode":       { lat: 11.2588,  lng: 75.7804  },
  "calicut":         { lat: 11.2588,  lng: 75.7804  },
  "thrissur":        { lat: 10.5276,  lng: 76.2144  },
  "kannur":          { lat: 11.8745,  lng: 75.3704  },
  "visakhapatnam":   { lat: 17.6868,  lng: 83.2185  },
  "vizag":           { lat: 17.6868,  lng: 83.2185  },
  "vijayawada":      { lat: 16.5062,  lng: 80.6480  },
  "guntur":          { lat: 16.3067,  lng: 80.4365  },
  "tirupati":        { lat: 13.6288,  lng: 79.4192  },
  "warangal":        { lat: 17.9784,  lng: 79.5941  },
  "nellore":         { lat: 14.4426,  lng: 79.9865  },
  "kurnool":         { lat: 15.8281,  lng: 78.0373  },
  "rajahmundry":     { lat: 17.0005,  lng: 81.8040  },
  "karimnagar":      { lat: 18.4386,  lng: 79.1288  },
  "mangalore":       { lat: 12.9141,  lng: 74.8560  },
  "mysuru":          { lat: 12.2958,  lng: 76.6394  },
  "mysore":          { lat: 12.2958,  lng: 76.6394  },
  "hubli":           { lat: 15.3647,  lng: 75.1240  },
  "dharwad":         { lat: 15.4589,  lng: 75.0078  },
  "bellary":         { lat: 15.1394,  lng: 76.9214  },
  "gulbarga":        { lat: 17.3297,  lng: 76.8343  },
  "davanagere":      { lat: 14.4644,  lng: 75.9218  },

  // East India
  "kolkata":         { lat: 22.5726,  lng: 88.3639  },
  "calcutta":        { lat: 22.5726,  lng: 88.3639  },
  "patna":           { lat: 25.5941,  lng: 85.1376  },
  "ranchi":          { lat: 23.3441,  lng: 85.3096  },
  "jamshedpur":      { lat: 22.8046,  lng: 86.2029  },
  "bhubaneswar":     { lat: 20.2961,  lng: 85.8245  },
  "cuttack":         { lat: 20.4625,  lng: 85.8830  },
  "guwahati":        { lat: 26.1445,  lng: 91.7362  },

  // Central India
  "bhopal":          { lat: 23.2599,  lng: 77.4126  },
  "indore":          { lat: 22.7196,  lng: 75.8577  },
  "jabalpur":        { lat: 23.1815,  lng: 79.9864  },
  "gwalior":         { lat: 26.2183,  lng: 78.1828  },
  "raipur":          { lat: 21.2514,  lng: 81.6296  },

  // North-East & Others
  "siliguri":        { lat: 26.7271,  lng: 88.3953  },
  "agartala":        { lat: 23.8315,  lng: 91.2868  },
  "imphal":          { lat: 24.8170,  lng: 93.9368  },
  "shillong":        { lat: 25.5788,  lng: 91.8933  },
};

// ── Alias map (non-canonical → canonical key) ─────────────────────────────
// All values must be keys that exist in CITY_COORDS above.
const ALIASES = {
  "new delhi":          "delhi",
  "bangalore":          "bengaluru",
  "calcutta":           "kolkata",
  "bombay":             "mumbai",
  "madras":             "chennai",
  "cochin":             "kochi",
  "trivandrum":         "thiruvananthapuram",
  "calicut":            "kozhikode",
  "vizag":              "visakhapatnam",
  "allahabad":          "prayagraj",
  "gurugram":           "gurgaon",
  "trichy":             "tiruchirappalli",
  "mysore":             "mysuru",
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns { lat, lng } for a given Indian city name.
 * Lookup is case-insensitive and trims surrounding whitespace.
 * Returns null if the city is not in the table.
 *
 * @param {string} cityName - Raw city name from DB (e.g. "delhi", "CHENNAI", "New Delhi")
 * @returns {{ lat: number, lng: number } | null}
 */
export function getCityCoordinates(cityName) {
  if (!cityName || typeof cityName !== "string") return null;

  const key = cityName.trim().toLowerCase();

  // Check alias first, then direct lookup
  const canonical = ALIASES[key] ?? key;
  return CITY_COORDS[canonical] ?? null;
}

// ── Haversine + route estimate ───────────────────────────────────────────────────────
// Exported here so TrackShipment.jsx and ShipmentMap.jsx share one implementation.

/**
 * Returns the great-circle distance in kilometres between two {lat, lng} points.
 */
export function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat  = toRad(b.lat - a.lat);
  const dLng  = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

/**
 * Estimates road distance and travel time between two {lat, lng} points.
 * Road distance ≈ straight-line × 1.3 (empirical road-factor for India).
 * Travel time assumes an average speed of 50 km/h.
 *
 * @param {{ lat: number, lng: number }} origin
 * @param {{ lat: number, lng: number }} dest
 * @returns {{ distance: string, duration: string }}
 */
export function estimateRoute(origin, dest) {
  const straight = haversineKm(origin, dest);
  const road     = straight * 1.3;
  const hours    = road / 50;
  const hInt     = Math.floor(hours);
  const mInt     = Math.round((hours - hInt) * 60);
  const duration = hInt > 0 ? `~${hInt}h ${mInt}m` : `~${mInt}m`;
  return { distance: `~${road.toFixed(0)} km`, duration };
}

/**
 * Returns all city names present in the lookup table (canonical names only).
 * Useful for autocomplete or debugging.
 *
 * @returns {string[]}
 */
export function listSupportedCities() {
  return Object.keys(CITY_COORDS);
}
