// src/pages/PlayersList.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getAvailablePlayers, setAvailability, removeAvailability } from "../services/playerService";
import LoadingSpinner from "../components/LoadingSpinner";
import { AVAILABILITY_OPTIONS } from "../utils/constants";

export default function PlayersList() {
  const { currentUser } = useAuth();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTime, setSelectedTime] = useState(60);
  const [toggling, setToggling] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);

  const fetchPlayers = () => {
    getAvailablePlayers().then(setPlayers).finally(() => setLoading(false));
  };

  useEffect(() => { fetchPlayers(); }, []);

  async function handleToggle() {
    if (!currentUser) return alert("Please login to set availability.");
    setToggling(true);
    try {
      if (isAvailable) {
        await removeAvailability(currentUser.uid);
        setIsAvailable(false);
      } else {
        await setAvailability(currentUser.uid, selectedTime);
        setIsAvailable(true);
      }
      fetchPlayers();
    } catch (err) {
      alert("Error: " + err.message);
    }
    setToggling(false);
  }

  if (loading) return <LoadingSpinner text="Finding players..." />;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Available Players 👥</h1>
        <p>Players who are ready to play right now</p>
      </div>

      {currentUser && (
        <div className="availability-toggle-card">
          <div className="toggle-info">
            <h3>Your Availability</h3>
            <p>Let others know you're ready to play</p>
          </div>
          <div className="toggle-controls">
            {!isAvailable && (
              <select value={selectedTime} onChange={(e) => setSelectedTime(Number(e.target.value))}>
                {AVAILABILITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            )}
            <button onClick={handleToggle} disabled={toggling}
              className={isAvailable ? "btn-danger-sm" : "btn-primary"}>
              {toggling ? "..." : isAvailable ? "Remove Availability" : "Set as Available"}
            </button>
          </div>
        </div>
      )}

      <div className="players-section">
        <h3>Currently Available ({players.length})</h3>
        {players.length === 0 ? (
          <div className="empty-state"><p>🏃 No players available right now. Be the first!</p></div>
        ) : (
          <div className="players-grid">
            {players.map((p) => (
              <div key={p.id} className="player-card">
                <div className="player-avatar">{p.full_name?.[0]?.toUpperCase() || "?"}</div>
                <div className="player-info">
                  <strong>{p.full_name}</strong>
                  <small>Available until {new Date(p.availability_until).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</small>
                </div>
                <span className="available-dot">●</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
