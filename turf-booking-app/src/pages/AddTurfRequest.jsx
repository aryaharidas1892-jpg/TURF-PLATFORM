// src/pages/AddTurfRequest.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { submitTurfRequest } from "../services/turfRequestService";
import { storage } from "../firebase/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const SPORTS_LIST = ["Football", "Cricket", "Basketball", "Badminton", "Tennis", "Volleyball", "Hockey", "Kabaddi"];
const AMENITIES_LIST = ["Parking", "Changing Rooms", "Floodlights", "Washrooms", "Drinking Water", "Cafeteria", "First Aid", "CCTV Security"];

const INITIAL = {
    turfName: "", description: "",
    pricePerHour: "",
    address: "", city: "", mapsLink: "",
    openingTime: "06:00", closingTime: "22:00",
    sports: [], amenities: [],
    imageFile: null, imageUrl: "", // store file locally, url generated on submit
    ownerName: "", ownerPhone: "", ownerEmail: "",
};

function toggle(arr, val) {
    return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
}

export default function AddTurfRequest({ embeddedMode = false }) {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState(INITIAL);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState("");

    const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

    function validate() {
        const required = ["turfName", "description", "pricePerHour", "address", "city", "openingTime", "closingTime", "imageUrl", "ownerName", "ownerPhone", "ownerEmail"];
        for (const k of required) {
            if (!form[k]?.toString().trim()) {
                setError(`Please fill in: ${k.replace(/([A-Z])/g, " $1")}`);
                return false;
            }
        }
        if (form.sports.length === 0) { setError("Select at least one sport."); return false; }
        if (form.amenities.length === 0) { setError("Select at least one amenity."); return false; }
        if (!form.imageFile) { setError("Please upload a turf image."); return false; }
        if (isNaN(Number(form.pricePerHour)) || Number(form.pricePerHour) <= 0) {
            setError("Enter a valid price per hour."); return false;
        }
        if (!/^\d{10}$/.test(form.ownerPhone.replace(/\s/g, ""))) {
            setError("Enter a valid 10-digit phone number."); return false;
        }
        setError(""); return true;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!validate()) return;
        setSubmitting(true);
        try {
            // 1. Upload image to Firebase Storage
            const ext = form.imageFile.name.split(".").pop();
            const fileName = `turf_${Date.now()}.${ext}`;
            const imageRef = ref(storage, `turf_images/${fileName}`);

            await uploadBytes(imageRef, form.imageFile);
            const downloadUrl = await getDownloadURL(imageRef);

            // 2. Submit the turf request with the new image URL
            const submissionData = { ...form, imageUrl: downloadUrl };
            delete submissionData.imageFile; // not needed in Firestore

            await submitTurfRequest(currentUser, submissionData);
            setSubmitted(true);
        } catch (err) {
            setError("Failed to submit: " + err.message);
        }
        setSubmitting(false);
    }

    if (submitted) {
        const inner = (
            <div className="atr-success">
                <div className="atr-success-icon">🏟️</div>
                <h2>Request Submitted!</h2>
                <p>Thank you! Our team will review your turf listing and get back to you. This usually takes 1–3 business days.</p>
                {!embeddedMode && (
                    <div className="atr-success-actions">
                        <Link to="/my-turf-requests" className="btn-primary">View My Requests</Link>
                        <Link to="/" className="btn-outline">Go Home</Link>
                    </div>
                )}
            </div>
        );
        return embeddedMode ? inner : <div className="page-container">{inner}</div>;
    }

    const content = (
        <>
            {!embeddedMode && (
                <div className="page-header">
                    <h1>List Your Turf 🏟️</h1>
                    <p>Fill in the details below — our team will review and add your turf to the platform.</p>
                </div>
            )}
            <form className="atr-form" onSubmit={handleSubmit} noValidate>

                {/* Basic Info */}
                <div className="atr-section">
                    <h2 className="atr-section-title">📋 Basic Information</h2>
                    <div className="form-group">
                        <label>Turf Name *</label>
                        <input type="text" placeholder="e.g. Green Arena Sports Club" value={form.turfName} onChange={(e) => set("turfName", e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Description *</label>
                        <textarea rows={3} placeholder="Describe your turf — surface type, size, features..." value={form.description} onChange={(e) => set("description", e.target.value)} />
                    </div>
                </div>

                {/* Pricing */}
                <div className="atr-section">
                    <h2 className="atr-section-title">💰 Pricing</h2>
                    <div className="form-group">
                        <label>Price per Hour (₹) *</label>
                        <input type="number" min="1" placeholder="e.g. 800" value={form.pricePerHour} onChange={(e) => set("pricePerHour", e.target.value)} />
                    </div>
                </div>

                {/* Location */}
                <div className="atr-section">
                    <h2 className="atr-section-title">📍 Location</h2>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Full Address *</label>
                            <input type="text" placeholder="Street / Area / Landmark" value={form.address} onChange={(e) => set("address", e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>City *</label>
                            <input type="text" placeholder="e.g. Mumbai" value={form.city} onChange={(e) => set("city", e.target.value)} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Google Maps Link <span className="optional-label">(optional)</span></label>
                        <input type="url" placeholder="https://maps.google.com/..." value={form.mapsLink} onChange={(e) => set("mapsLink", e.target.value)} />
                    </div>
                </div>

                {/* Timings */}
                <div className="atr-section">
                    <h2 className="atr-section-title">🕐 Operating Hours</h2>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Opening Time *</label>
                            <input type="time" value={form.openingTime} onChange={(e) => set("openingTime", e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>Closing Time *</label>
                            <input type="time" value={form.closingTime} onChange={(e) => set("closingTime", e.target.value)} />
                        </div>
                    </div>
                </div>

                {/* Sports */}
                <div className="atr-section">
                    <h2 className="atr-section-title">⚽ Sports Available *</h2>
                    <div className="atr-checkbox-grid">
                        {SPORTS_LIST.map((sport) => (
                            <label key={sport} className={`atr-checkbox-item ${form.sports.includes(sport) ? "checked" : ""}`}>
                                <input type="checkbox" checked={form.sports.includes(sport)} onChange={() => set("sports", toggle(form.sports, sport))} />
                                {sport}
                            </label>
                        ))}
                    </div>
                </div>

                {/* Amenities */}
                <div className="atr-section">
                    <h2 className="atr-section-title">🏗️ Amenities Available *</h2>
                    <div className="atr-checkbox-grid">
                        {AMENITIES_LIST.map((a) => (
                            <label key={a} className={`atr-checkbox-item ${form.amenities.includes(a) ? "checked" : ""}`}>
                                <input type="checkbox" checked={form.amenities.includes(a)} onChange={() => set("amenities", toggle(form.amenities, a))} />
                                {a}
                            </label>
                        ))}
                    </div>
                </div>

                {/* Media */}
                <div className="atr-section">
                    <h2 className="atr-section-title">📸 Turf Image</h2>
                    <div className="form-group">
                        <label>Upload Image * <span className="optional-label">(JPEG, PNG, or WebP)</span></label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                    set("imageFile", file);
                                    set("imageUrl", URL.createObjectURL(file)); // for preview
                                }
                            }}
                        />
                    </div>
                    {form.imageUrl && (
                        <div style={{ marginTop: 12 }}>
                            <p style={{ fontSize: "0.85rem", color: "var(--gray-500)", marginBottom: 4 }}>Image Preview:</p>
                            <img src={form.imageUrl} alt="Turf preview" className="atr-img-preview" />
                        </div>
                    )}
                </div>

                {/* Contact */}
                <div className="atr-section">
                    <h2 className="atr-section-title">📞 Owner / Contact Details</h2>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Owner Name *</label>
                            <input type="text" placeholder="Full name" value={form.ownerName} onChange={(e) => set("ownerName", e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>Phone Number *</label>
                            <input type="tel" placeholder="10-digit mobile" value={form.ownerPhone} onChange={(e) => set("ownerPhone", e.target.value)} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Owner Email *</label>
                        <input type="email" placeholder="owner@example.com" value={form.ownerEmail} onChange={(e) => set("ownerEmail", e.target.value)} />
                    </div>
                </div>

                {error && <div className="alert alert-error">⚠️ {error}</div>}

                <div className="atr-disclaimer">
                    <span>🔒</span>
                    <p>By submitting, you confirm that all details are accurate and the turf is genuine. Fraudulent submissions will be permanently banned.</p>
                </div>

                <button type="submit" className="btn-pay" disabled={submitting}>
                    {submitting ? "Submitting Request…" : "Submit Turf Listing Request →"}
                </button>
            </form>
        </>
    );

    return embeddedMode ? content : <div className="page-container">{content}</div>;
}
