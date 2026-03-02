// src/pages/TurfList.jsx
import { useEffect, useState } from "react";
import { getAllTurfs } from "../services/turfService";
import TurfCard from "../components/TurfCard";
import LoadingSpinner from "../components/LoadingSpinner";

export default function TurfList() {
  const [turfs, setTurfs] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllTurfs()
      .then((data) => { setTurfs(data); setFiltered(data); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(turfs.filter((t) => t.name.toLowerCase().includes(q) || t.location.toLowerCase().includes(q)));
  }, [search, turfs]);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Browse Turfs</h1>
        <p>Find the perfect turf near you</p>
      </div>
      <div className="search-bar">
        <input
          type="text"
          placeholder="🔍 Search by name or location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
      </div>
      {loading ? (
        <LoadingSpinner text="Finding turfs..." />
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <p>🏟️ No turfs found. Try a different search.</p>
        </div>
      ) : (
        <div className="turf-grid">
          {filtered.map((turf) => <TurfCard key={turf.id} turf={turf} />)}
        </div>
      )}
    </div>
  );
}
