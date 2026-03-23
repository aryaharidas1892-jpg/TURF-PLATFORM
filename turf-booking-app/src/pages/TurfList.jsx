// src/pages/TurfList.jsx
import { useEffect, useState } from "react";
import { getAllTurfs } from "../services/turfService";
import TurfCard from "../components/TurfCard";
import LoadingSpinner from "../components/LoadingSpinner";

const SPORT_FILTERS = ["All", "Football", "Cricket", "Basketball", "Badminton", "Tennis", "Volleyball", "Hockey", "Kabaddi"];

export default function TurfList() {
  const [turfs, setTurfs] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [sportFilter, setSportFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllTurfs()
      .then((data) => { setTurfs(data); setFiltered(data); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    let results = turfs;
    if (q) {
      results = results.filter(
        (t) => (t.name || t.turfName || "").toLowerCase().includes(q) ||
               (t.location || t.city || "").toLowerCase().includes(q)
      );
    }
    if (sportFilter !== "All") {
      results = results.filter((t) => (t.sports || []).includes(sportFilter));
    }
    setFiltered(results);
  }, [search, sportFilter, turfs]);

  return (
    <div className="turflist-page">
      {/* Header */}
      <div className="turflist-header">
        <h1>Browse Turfs 🏟️</h1>
        <p>Find and book the perfect turf near you</p>
      </div>

      {/* Search + filters */}
      <div className="turflist-controls">
        <div className="turflist-search-wrap">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by name or city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="turflist-search"
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch("")}>✕</button>
          )}
        </div>
        <div className="turflist-sport-filters">
          {SPORT_FILTERS.map((s) => (
            <button
              key={s}
              className={`sport-filter-btn ${sportFilter === s ? "active" : ""}`}
              onClick={() => setSportFilter(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <LoadingSpinner text="Finding turfs…" />
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <p>🏟️ No turfs found. Try a different search or filter.</p>
          <button className="btn-outline-sm" onClick={() => { setSearch(""); setSportFilter("All"); }}>
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          <p className="turflist-count">{filtered.length} turf{filtered.length !== 1 ? "s" : ""} found</p>
          <div className="turf-grid-v2">
            {filtered.map((turf) => <TurfCard key={turf.id} turf={turf} />)}
          </div>
        </>
      )}
    </div>
  );
}
