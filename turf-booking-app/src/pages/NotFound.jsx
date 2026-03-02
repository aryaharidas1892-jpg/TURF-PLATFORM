// src/pages/NotFound.jsx
import { Link } from "react-router-dom";
export default function NotFound() {
  return (
    <div className="page-container center-content">
      <h1 style={{ fontSize: "5rem" }}>404</h1>
      <h2>Page Not Found</h2>
      <p>The page you are looking for doesn't exist.</p>
      <Link to="/" className="btn-primary">Go Home</Link>
    </div>
  );
}
