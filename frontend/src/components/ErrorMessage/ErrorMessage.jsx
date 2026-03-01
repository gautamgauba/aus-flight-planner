import './ErrorMessage.css';

export default function ErrorMessage({ message }) {
  return (
    <div className="error-message">
      <strong>Error:</strong> {message}
    </div>
  );
}
