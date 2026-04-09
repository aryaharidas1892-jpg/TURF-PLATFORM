// src/routes/OwnerRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Protects routes that require an approved owner account.
 * - Not logged in → /login
 * - owner_pending → /owner/pending
 * - user (not owner) → /turfs
 * - owner or admin → renders children
 */
export default function OwnerRoute({ children }) {
  const { currentUser, userRole } = useAuth();

  if (!currentUser) return <Navigate to="/login" replace />;
  if (userRole === "owner_pending") return <Navigate to="/owner/pending" replace />;
  if (userRole !== "owner" && userRole !== "admin") return <Navigate to="/turfs" replace />;

  return children;
}
