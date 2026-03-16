// src/services/reportService.js
import { db } from "../firebase/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

/**
 * Predefined report reasons shown to the user in the report modal.
 */
export const REPORT_REASONS = [
    "Fake Identity / Impersonation",
    "Sexual Harassment or Inappropriate Messages",
    "Abusive or Offensive Language",
    "Spam or Promotional Content",
    "Threatening or Violent Behavior",
    "Racism or Hate Speech",
    "Underage User",
    "Suspicious / Bot Activity",
    "Sharing Personal Information of Others",
    "Other",
];

/**
 * Submit a report about a player.
 * Saved to the `reports` collection in Firestore for manual admin review.
 *
 * @param {object} reporter  - { uid, email, displayName }
 * @param {object} reported  - { uid, full_name }
 * @param {string} reason    - one of REPORT_REASONS
 * @param {string} details   - optional extra context from the reporter
 */
export async function submitReport(reporter, reported, reason, details = "") {
    await addDoc(collection(db, "reports"), {
        // Who filed the report
        reporterUid: reporter.uid,
        reporterEmail: reporter.email || "",
        reporterName: reporter.displayName || "Anonymous",

        // Who is being reported
        reportedUid: reported.uid,
        reportedName: reported.full_name || "Unknown",

        // Report details
        reason,
        details: details.trim(),

        // Admin workflow fields
        status: "pending", // pending | reviewed | dismissed
        createdAt: serverTimestamp(),
    });
}
