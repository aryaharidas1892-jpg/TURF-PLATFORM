// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../firebase/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import {
  createUserProfile,
  getUserProfile,
  submitOwnerRequest,
} from "../services/ownerService";

const ADMIN_UID = import.meta.env.VITE_ADMIN_UID;
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // "user" | "owner_pending" | "owner" | "admin"
  const [loading, setLoading] = useState(true);

  /** Regular user signup — creates Firebase account + Firestore profile */
  async function signup(email, password, fullName) {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: fullName });
    await createUserProfile(credential.user.uid, {
      role: "user",
      displayName: fullName,
      email,
      phone: "",
    });
    setUserRole("user");
    return credential;
  }

  /** Owner signup — creates Firebase account + owner_pending profile + owner_request.
   * If the Firestore writes fail, the Firebase Auth account is deleted (rollback)
   * so the user isn't left in a half-created state.
   */
  async function ownerSignup(email, password, ownerForm) {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    try {
      await updateProfile(credential.user, { displayName: ownerForm.fullName });
      await submitOwnerRequest(credential.user.uid, { ...ownerForm, email });
      setUserRole("owner_pending");
      return credential;
    } catch (err) {
      // Rollback: delete the Firebase Auth account so they can retry
      try { await credential.user.delete(); } catch { /* ignore delete errors */ }
      throw err; // re-throw so OwnerSignup page shows the real error
    }
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    setUserRole(null);
    return signOut(auth);
  }

  // Resolve role whenever auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Admin is identified by hardcoded UID
        if (user.uid === ADMIN_UID) {
          setUserRole("admin");
        } else {
          try {
            const profile = await getUserProfile(user.uid);
            if (profile?.isBlocked) {
              await signOut(auth);
              alert("Your account has been suspended by the administrator.");
              setUserRole(null);
              setCurrentUser(null);
            } else {
              setUserRole(profile?.role || "user");
            }
          } catch {
            setUserRole("user"); // fallback
          }
        }
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    isAdmin: userRole === "admin",
    isOwner: userRole === "owner",
    isOwnerPending: userRole === "owner_pending",
    isUser: userRole === "user",
    signup,
    ownerSignup,
    login,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
