// src/pages/PlayersList.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getAvailablePlayers, setAvailability, removeAvailability } from "../services/playerService";
import LoadingSpinner from "../components/LoadingSpinner";
import ChatModal from "../components/ChatModal";
import ChatInbox from "../components/ChatInbox";
import ReportModal from "../components/ReportModal";

const SPORTS_LIST = [
  "Cricket", "Football", "Hockey", "Basketball",
  "Badminton", "Tennis", "Volleyball", "Kabaddi",
];

/** Generate half-hour time options from 05:00 to 23:30 */
function generateTimeOptions() {
  const options = [];
  for (let h = 5; h <= 23; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      const value = `${hh}:${mm}`;
      const period = h < 12 ? "AM" : "PM";
      const displayH = h % 12 === 0 ? 12 : h % 12;
      const label = `${displayH}:${mm} ${period}`;
      options.push({ value, label });
    }
  }
  return options;
}

const TIME_OPTIONS = generateTimeOptions();

function getDefaultTimes() {
  const now = new Date();
  const totalMins = now.getHours() * 60 + now.getMinutes();
  const nextSlotMins = Math.ceil((totalMins + 1) / 30) * 30;
  const startMins = nextSlotMins % (24 * 60);
  const endMins = (startMins + 60) % (24 * 60);

  const fmt = (totalM) => {
    const h = Math.floor(totalM / 60) % 24;
    const m = totalM % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const startH = Math.floor(startMins / 60);
  if (startH < 5 || startH >= 23) {
    return { startTime: "05:00", endTime: "06:00" };
  }
  return { startTime: fmt(startMins), endTime: fmt(endMins) };
}

export default function PlayersList() {
  const { currentUser } = useAuth();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [chatTarget, setChatTarget] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const [sportFilter, setSportFilter] = useState("All");

  // Availability form state
  const defaults = getDefaultTimes();
  const [startTime, setStartTime] = useState(defaults.startTime);
  const [endTime, setEndTime] = useState(defaults.endTime);
  const [timeError, setTimeError] = useState("");
  const [selectedSports, setSelectedSports] = useState([]);

  const fetchPlayers = () => {
    getAvailablePlayers().then(setPlayers).finally(() => setLoading(false));
  };

  useEffect(() => { fetchPlayers(); }, []);

  function toggleSport(sport) {
    setSelectedSports((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]
    );
  }

  function validateTimes() {
    if (startTime >= endTime) {
      setTimeError("End time must be after start time.");
      return false;
    }
    setTimeError("");
    return true;
  }

  async function handleToggle() {
    if (!currentUser) return alert("Please login to set availability.");
    if (!isAvailable && !validateTimes()) return;
    setToggling(true);
    try {
      if (isAvailable) {
        await removeAvailability(currentUser.uid);
        setIsAvailable(false);
        setSelectedSports([]);
      } else {
        await setAvailability(currentUser.uid, startTime, endTime, selectedSports);
        setIsAvailable(true);
      }
      fetchPlayers();
    } catch (err) {
      alert("Error: " + err.message);
    }
    setToggling(false);
  }

  function fmtTime(date) {
    if (!date) return "";
    return new Date(date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  }

  // Filter players by selected sport
  const filteredPlayers =
    sportFilter === "All"
      ? players
      : players.filter((p) => (p.sports || []).includes(sportFilter));

  if (loading) return <LoadingSpinner text="Finding players..." />;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Available Players 👥</h1>
        <p>Players who are ready to play right now</p>
      </div>

      {/* Availability toggle */}
      {currentUser && (
        <div className="availability-toggle-card">
          <div className="toggle-info">
            <h3>Your Availability</h3>
            <p>Set the time slot when you're ready to play</p>
          </div>
          <div className="toggle-controls-col">
            {!isAvailable && (
              <>
                {/* Time picker */}
                <div className="timeslot-picker">
                  <div className="timeslot-field">
                    <label>From</label>
                    <select value={startTime} onChange={(e) => { setStartTime(e.target.value); setTimeError(""); }}>
                      {TIME_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <span className="timeslot-arrow">→</span>
                  <div className="timeslot-field">
                    <label>To</label>
                    <select value={endTime} onChange={(e) => { setEndTime(e.target.value); setTimeError(""); }}>
                      {TIME_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Sports selector (optional) */}
                <div className="sports-select-section">
                  <label className="sports-select-label">
                    ⚽ Sports you want to play <span className="optional-label">(optional)</span>
                  </label>
                  <div className="sports-chips-row">
                    {SPORTS_LIST.map((sport) => (
                      <button
                        key={sport}
                        type="button"
                        className={`sport-chip-btn ${selectedSports.includes(sport) ? "active" : ""}`}
                        onClick={() => toggleSport(sport)}
                      >
                        {sport}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            {timeError && <p className="timeslot-error">{timeError}</p>}
            <button
              onClick={handleToggle}
              disabled={toggling}
              className={isAvailable ? "btn-danger-sm" : "btn-primary"}
            >
              {toggling ? "..." : isAvailable ? "Remove Availability" : "Set as Available"}
            </button>
          </div>
        </div>
      )}

      {/* Inbox */}
      {currentUser && (
        <ChatInbox currentUser={currentUser} onOpenChat={(player) => setChatTarget(player)} />
      )}

      {/* Sport filter */}
      <div className="sport-filter-row">
        <span className="sport-filter-label">Filter by sport:</span>
        {["All", ...SPORTS_LIST].map((sport) => (
          <button
            key={sport}
            className={`sport-filter-btn ${sportFilter === sport ? "active" : ""}`}
            onClick={() => setSportFilter(sport)}
          >
            {sport}
          </button>
        ))}
      </div>

      {/* Players list */}
      <div className="players-section">
        <h3>Currently Available ({filteredPlayers.length})</h3>
        {filteredPlayers.length === 0 ? (
          <div className="empty-state">
            <p>🏃 No players available{sportFilter !== "All" ? ` for ${sportFilter}` : ""} right now. Be the first!</p>
          </div>
        ) : (
          <div className="players-grid">
            {filteredPlayers.map((p) => (
              <div key={p.id} className="player-card">
                <div className="player-avatar">{p.full_name?.[0]?.toUpperCase() || "?"}</div>
                <div className="player-info">
                  <strong>{p.full_name}</strong>
                  <small>
                    {p.availability_from
                      ? `${fmtTime(p.availability_from)} – ${fmtTime(p.availability_until)}`
                      : `Until ${fmtTime(p.availability_until)}`}
                  </small>
                  {/* Sports badges */}
                  {p.sports && p.sports.length > 0 && (
                    <div className="player-sports-badges">
                      {p.sports.map((s) => (
                        <span key={s} className="player-sport-badge">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="player-card-actions">
                  <span className="available-dot">●</span>
                  {currentUser && p.uid !== currentUser.uid && (
                    <>
                      <button
                        className="btn-contact"
                        onClick={() => setChatTarget(p)}
                        title={`Chat with ${p.full_name}`}
                      >
                        💬 Contact
                      </button>
                      <button
                        className="btn-report"
                        onClick={() => setReportTarget(p)}
                        title={`Report ${p.full_name}`}
                      >
                        🚩
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {chatTarget && currentUser && (
        <ChatModal
          currentUser={currentUser}
          otherPlayer={chatTarget}
          onClose={() => setChatTarget(null)}
        />
      )}

      {reportTarget && currentUser && (
        <ReportModal
          currentUser={currentUser}
          reportedPlayer={reportTarget}
          onClose={() => setReportTarget(null)}
        />
      )}
    </div>
  );
}
