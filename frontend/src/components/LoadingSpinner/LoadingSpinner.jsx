import './LoadingSpinner.css';

export default function LoadingSpinner({ message }) {
  return (
    <div className="loading-spinner">
      <div className="spinner" />
      <p>{message || 'Loading...'}</p>
    </div>
  );
}
