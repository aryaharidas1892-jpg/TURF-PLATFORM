// src/components/ReportModal.jsx
import { useEffect, useState } from "react";
import { submitReport, REPORT_REASONS } from "../services/reportService";

export default function ReportModal({ currentUser, reportedPlayer, onClose }) {
    const [selectedReason, setSelectedReason] = useState("");
    const [details, setDetails] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState("");

    // Close on Escape
    useEffect(() => {
        const handleKey = (e) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [onClose]);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!selectedReason) {
            setError("Please select a reason.");
            return;
        }
        setError("");
        setSubmitting(true);
        try {
            await submitReport(
                {
                    uid: currentUser.uid,
                    email: currentUser.email,
                    displayName: currentUser.displayName,
                },
                reportedPlayer,
                selectedReason,
                details
            );
            setSubmitted(true);
        } catch (err) {
            setError("Failed to submit report. Please try again.");
            console.error(err);
        }
        setSubmitting(false);
    }

    return (
        <div className="report-overlay" onClick={onClose}>
            <div className="report-modal" onClick={(e) => e.stopPropagation()}>

                {submitted ? (
                    /* ── Success state ── */
                    <div className="report-success">
                        <div className="report-success-icon">🛡️</div>
                        <h3>Report Submitted</h3>
                        <p>
                            Thank you for keeping our community safe. Our team will review
                            your report and take appropriate action.
                        </p>
                        <button className="btn-primary" onClick={onClose}>
                            Done
                        </button>
                    </div>
                ) : (
                    /* ── Form state ── */
                    <>
                        {/* Header */}
                        <div className="report-header">
                            <div className="report-header-icon">🚩</div>
                            <div>
                                <h3>Report Player</h3>
                                <p>Reporting <strong>{reportedPlayer.full_name}</strong></p>
                            </div>
                            <button
                                className="report-close-btn"
                                onClick={onClose}
                                aria-label="Close"
                            >
                                ✕
                            </button>
                        </div>

                        <form className="report-form" onSubmit={handleSubmit}>
                            {/* Reason selector */}
                            <div className="report-reasons-label">
                                Select a reason <span className="required">*</span>
                            </div>
                            <div className="report-reasons-list">
                                {REPORT_REASONS.map((reason) => (
                                    <label
                                        key={reason}
                                        className={`report-reason-item ${selectedReason === reason ? "selected" : ""}`}
                                    >
                                        <input
                                            type="radio"
                                            name="reason"
                                            value={reason}
                                            checked={selectedReason === reason}
                                            onChange={() => { setSelectedReason(reason); setError(""); }}
                                        />
                                        <span>{reason}</span>
                                    </label>
                                ))}
                            </div>

                            {/* Optional details */}
                            <div className="report-details-wrap">
                                <label className="report-details-label">
                                    Additional details <span className="optional">(optional)</span>
                                </label>
                                <textarea
                                    className="report-textarea"
                                    placeholder="Describe what happened in more detail..."
                                    value={details}
                                    onChange={(e) => setDetails(e.target.value)}
                                    rows={3}
                                    maxLength={500}
                                />
                                <div className="report-char-count">{details.length}/500</div>
                            </div>

                            {error && <div className="alert alert-error">{error}</div>}

                            <div className="report-actions">
                                <button
                                    type="button"
                                    className="btn-outline"
                                    onClick={onClose}
                                    disabled={submitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-report-submit"
                                    disabled={!selectedReason || submitting}
                                >
                                    {submitting ? "Submitting..." : "Submit Report"}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
