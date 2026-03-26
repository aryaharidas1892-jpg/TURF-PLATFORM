// src/pages/MapPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Interactive Map Page using Leaflet.js + OpenStreetMap (100% FREE, no API key)
// Nearby places fetched from Overpass API (free, open-source)
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState, useCallback } from "react";
import "../styles/map.css";

// Leaflet CSS injected dynamically so no extra import config needed
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

// Category definitions: label, icon, Overpass amenity / tag query
const CATEGORIES = [
  { key: "all",        label: "All",        icon: "🌍", query: null },
  { key: "restaurant", label: "Food",       icon: "🍽️", query: '[amenity~"restaurant|cafe|fast_food"]' },
  { key: "hospital",   label: "Medical",    icon: "🏥", query: '[amenity~"hospital|clinic|pharmacy|doctors"]' },
  { key: "atm",        label: "ATM / Bank", icon: "🏧", query: '[amenity~"atm|bank"]' },
  { key: "college",    label: "Education",  icon: "🎓", query: '[amenity~"university|college|school"]' },
  { key: "sport",      label: "Sports",     icon: "⚽", query: '[leisure~"sports_centre|stadium|pitch|park"]' },
];

// All-category combined query (used when key="all")
const ALL_QUERY = '[amenity~"restaurant|cafe|fast_food|hospital|clinic|pharmacy|atm|bank|university|college|school"]';

/** Calculate distance in km between two lat/lon points (Haversine) */
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2);
}

/** Build Overpass API query for given lat/lon and category */
function buildOverpassQuery(lat, lon, radius, tagQuery) {
  const q = tagQuery || ALL_QUERY;
  return `
    [out:json][timeout:15];
    (
      node${q}(around:${radius},${lat},${lon});
      way${q}(around:${radius},${lat},${lon});
    );
    out center 50;
  `;
}

/** Fetch nearby places from Overpass API */
async function fetchNearbyPlaces(lat, lon, radius, tagQuery) {
  const query = buildOverpassQuery(lat, lon, radius, tagQuery);
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Overpass API error");
  const data = await res.json();

  return data.elements
    .filter((el) => el.tags && el.tags.name)
    .map((el) => {
      const elLat = el.lat ?? el.center?.lat;
      const elLon = el.lon ?? el.center?.lon;
      return {
        id: el.id,
        name: el.tags.name,
        type: el.tags.amenity || el.tags.leisure || "place",
        rating: el.tags["stars"] || el.tags["rating"] || null,
        lat: elLat,
        lon: elLon,
        distance: haversine(lat, lon, elLat, elLon),
        website: el.tags.website || null,
        phone: el.tags.phone || el.tags["contact:phone"] || null,
      };
    })
    .sort((a, b) => a.distance - b.distance);
}

/** Geocode an address using Nominatim (OpenStreetMap) */
async function geocodeAddress(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  const data = await res.json();
  if (!data.length) throw new Error("Location not found");
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), label: data[0].display_name };
}

/** Category icon for a place type */
function placeIcon(type) {
  if (!type) return "📍";
  if (type.includes("restaurant") || type.includes("cafe") || type.includes("fast_food")) return "🍽️";
  if (type.includes("hospital") || type.includes("clinic") || type.includes("pharmacy") || type.includes("doctors")) return "🏥";
  if (type.includes("atm") || type.includes("bank")) return "🏧";
  if (type.includes("university") || type.includes("college") || type.includes("school")) return "🎓";
  if (type.includes("sport") || type.includes("stadium") || type.includes("pitch") || type.includes("park")) return "⚽";
  return "📍";
}

export default function MapPage() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const userMarkerRef = useRef(null);
  const placeMarkersRef = useRef([]);
  const leafletRef = useRef(null);

  const [userPos, setUserPos] = useState(null); // { lat, lon }
  const [places, setPlaces] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [radius] = useState(2000); // 2 km radius
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [mapReady, setMapReady] = useState(false);

  // ── Load Leaflet CSS + JS dynamically ─────────────────────────────────────
  useEffect(() => {
    // CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    // JS - use dynamic import of leaflet package
    import("leaflet").then((L) => {
      leafletRef.current = L.default || L;
      setMapReady(true);
    });
  }, []);

  // ── Initialize map once Leaflet is ready ──────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapContainerRef.current || mapRef.current) return;
    const L = leafletRef.current;

    const map = L.map(mapContainerRef.current, {
      center: [20.5937, 78.9629], // India center as default
      zoom: 5,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
  }, [mapReady]);

  // ── Set user location marker on map ───────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !userPos || !leafletRef.current) return;
    const L = leafletRef.current;
    const map = mapRef.current;

    // Remove old marker
    if (userMarkerRef.current) userMarkerRef.current.remove();

    const icon = L.divIcon({
      className: "",
      html: `<div class="map-user-dot"><div class="map-user-pulse"></div></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    userMarkerRef.current = L.marker([userPos.lat, userPos.lon], { icon })
      .addTo(map)
      .bindPopup("<strong>📍 You are here</strong>")
      .openPopup();

    map.flyTo([userPos.lat, userPos.lon], 14, { animate: true, duration: 1.5 });
  }, [userPos]);

  // ── Render place markers on map ────────────────────────────────────────────
  const renderMarkers = useCallback((placeList) => {
    if (!mapRef.current || !leafletRef.current) return;
    const L = leafletRef.current;
    const map = mapRef.current;

    // Remove old markers
    placeMarkersRef.current.forEach((m) => m.remove());
    placeMarkersRef.current = [];

    placeList.forEach((place) => {
      if (!place.lat || !place.lon) return;

      const icon = L.divIcon({
        className: "",
        html: `<div class="map-place-marker">${placeIcon(place.type)}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const popup = `
        <div class="map-popup">
          <strong>${place.name}</strong>
          <p class="map-popup-type">${placeIcon(place.type)} ${place.type}</p>
          ${place.rating ? `<p>⭐ ${place.rating}</p>` : ""}
          <p>📏 ${place.distance} km away</p>
          ${place.phone ? `<p>📞 ${place.phone}</p>` : ""}
        </div>
      `;

      const marker = L.marker([place.lat, place.lon], { icon })
        .addTo(map)
        .bindPopup(popup);

      marker.on("click", () => setSelectedPlace(place));
      placeMarkersRef.current.push(marker);
    });
  }, []);

  // ── Fetch nearby places whenever position or category changes ─────────────
  const loadPlaces = useCallback(async (lat, lon, categoryKey) => {
    if (!lat || !lon) return;
    setLoadingPlaces(true);
    setError(null);
    try {
      const cat = CATEGORIES.find((c) => c.key === categoryKey);
      const tagQuery = cat?.key === "all" ? null : cat?.query;
      const results = await fetchNearbyPlaces(lat, lon, radius, tagQuery);
      setPlaces(results);
      renderMarkers(results);
    } catch (err) {
      setError("Could not load nearby places. Please try again.");
    } finally {
      setLoadingPlaces(false);
    }
  }, [radius, renderMarkers]);

  // ── Detect my location ─────────────────────────────────────────────────────
  function detectLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setLoadingLocation(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        setUserPos({ lat, lon });
        setLoadingLocation(false);
        loadPlaces(lat, lon, activeCategory);
      },
      () => {
        setError("Could not get your location. Please allow location access or search manually.");
        setLoadingLocation(false);
      }
    );
  }

  // ── Search by address ──────────────────────────────────────────────────────
  async function handleSearch(e) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoadingLocation(true);
    setError(null);
    try {
      const { lat, lon } = await geocodeAddress(searchQuery.trim());
      setUserPos({ lat, lon });
      loadPlaces(lat, lon, activeCategory);
    } catch {
      setError("Location not found. Try a different search term.");
    } finally {
      setLoadingLocation(false);
    }
  }

  // ── Category filter change ─────────────────────────────────────────────────
  function handleCategory(key) {
    setActiveCategory(key);
    if (userPos) loadPlaces(userPos.lat, userPos.lon, key);
  }

  // ── Pan map to a place from the sidebar list ───────────────────────────────
  function focusPlace(place) {
    setSelectedPlace(place);
    if (mapRef.current && place.lat && place.lon) {
      mapRef.current.flyTo([place.lat, place.lon], 16, { animate: true, duration: 1 });
      // Open the corresponding marker popup
      const marker = placeMarkersRef.current.find((m) => {
        const ll = m.getLatLng();
        return Math.abs(ll.lat - place.lat) < 0.00001 && Math.abs(ll.lng - place.lon) < 0.00001;
      });
      if (marker) marker.openPopup();
    }
  }

  // ── Directions link using OSM route planner ────────────────────────────────
  function getDirectionsUrl(place) {
    if (!userPos) return `https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lon}`;
    return `https://www.openstreetmap.org/directions?from=${userPos.lat},${userPos.lon}&to=${place.lat},${place.lon}`;
  }

  return (
    <div className="map-page">
      {/* ── Top Bar ─────────────────────────────────────────────── */}
      <div className="map-topbar">
        <div className="map-topbar-left">
          <h1 className="map-title">🗺️ Explore Nearby</h1>
          <p className="map-subtitle">Find restaurants, hospitals, ATMs, colleges, and more around you</p>
        </div>

        {/* Search */}
        <form className="map-search-form" onSubmit={handleSearch}>
          <input
            type="text"
            className="map-search-input"
            placeholder="Search a location (e.g. Kozhikode, Kerala)…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="map-search-btn" disabled={loadingLocation}>
            {loadingLocation ? "…" : "🔍"}
          </button>
        </form>

        <button
          className="map-locate-btn"
          onClick={detectLocation}
          disabled={loadingLocation}
        >
          {loadingLocation ? "Locating…" : "📍 My Location"}
        </button>
      </div>

      {/* ── Category Filters ─────────────────────────────────────── */}
      <div className="map-categories">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            className={`map-cat-btn ${activeCategory === cat.key ? "active" : ""}`}
            onClick={() => handleCategory(cat.key)}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="map-error">
          ⚠️ {error}
        </div>
      )}

      {/* ── Main Layout: Map + Sidebar ───────────────────────────── */}
      <div className="map-body">
        {/* Map Container */}
        <div className="map-container-wrap">
          <div ref={mapContainerRef} className="map-leaflet-container" />
          {!userPos && !loadingLocation && (
            <div className="map-overlay-hint">
              <div className="map-hint-card">
                <span className="map-hint-icon">📍</span>
                <h3>No location set</h3>
                <p>Click "My Location" to detect automatically, or search for a city above.</p>
                <button className="btn-primary" onClick={detectLocation}>
                  📍 Detect My Location
                </button>
              </div>
            </div>
          )}
          {loadingPlaces && (
            <div className="map-loading-overlay">
              <div className="map-spinner" />
              <span>Loading nearby places…</span>
            </div>
          )}
        </div>

        {/* Places Sidebar */}
        <div className="map-sidebar">
          <div className="map-sidebar-header">
            <h3>Nearby Places</h3>
            {userPos && <span className="map-sidebar-count">{places.length} found</span>}
          </div>

          {!userPos ? (
            <div className="map-sidebar-empty">
              <span>🌍</span>
              <p>Set a location to see nearby places</p>
            </div>
          ) : loadingPlaces ? (
            <div className="map-sidebar-empty">
              <div className="map-spinner-sm" />
              <p>Searching nearby…</p>
            </div>
          ) : places.length === 0 ? (
            <div className="map-sidebar-empty">
              <span>😕</span>
              <p>No places found in this category nearby. Try a different category or increase range.</p>
            </div>
          ) : (
            <div className="map-places-list">
              {places.map((place) => (
                <div
                  key={place.id}
                  className={`map-place-card ${selectedPlace?.id === place.id ? "active" : ""}`}
                  onClick={() => focusPlace(place)}
                >
                  <div className="map-place-icon">{placeIcon(place.type)}</div>
                  <div className="map-place-info">
                    <strong className="map-place-name">{place.name}</strong>
                    <span className="map-place-type">{place.type}</span>
                    <div className="map-place-meta">
                      {place.rating && <span>⭐ {place.rating}</span>}
                      <span>📏 {place.distance} km</span>
                    </div>
                  </div>
                  <a
                    href={getDirectionsUrl(place)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="map-directions-btn"
                    onClick={(e) => e.stopPropagation()}
                    title="Get directions"
                  >
                    ➡️
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Selected Place Detail Panel ───────────────────────────── */}
      {selectedPlace && (
        <div className="map-detail-panel">
          <button className="map-detail-close" onClick={() => setSelectedPlace(null)}>✕</button>
          <div className="map-detail-icon">{placeIcon(selectedPlace.type)}</div>
          <div className="map-detail-info">
            <h3>{selectedPlace.name}</h3>
            <p className="map-detail-type">{selectedPlace.type}</p>
            <div className="map-detail-stats">
              {selectedPlace.rating && <span>⭐ Rating: {selectedPlace.rating}</span>}
              <span>📏 Distance: {selectedPlace.distance} km</span>
              {selectedPlace.phone && <span>📞 {selectedPlace.phone}</span>}
            </div>
          </div>
          <a
            href={getDirectionsUrl(selectedPlace)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary map-detail-dir-btn"
          >
            🧭 Get Directions
          </a>
        </div>
      )}
    </div>
  );
}
