// src/components/LoadingSpinner.jsx
export default function LoadingSpinner({ text = "Loading..." }) {
  return (
    <div className="spinner-container">
      <div className="spinner" />
      <p>{text}</p>
    </div>
  );
}
