import FlightCard from '../FlightCard/FlightCard.jsx';
import './FavoritesPanel.css';

export default function FavoritesPanel({ favorites, onRemove }) {
  if (favorites.length === 0) {
    return (
      <div className="favorites-panel empty">
        <p>No saved flights yet. Search for flights and click "Save" to add them here.</p>
      </div>
    );
  }

  return (
    <div className="favorites-panel">
      <h2>Saved Flights ({favorites.length})</h2>
      <div className="favorites-list">
        {favorites.map((flight, idx) => (
          <div key={idx} className="favorite-item">
            <p className="saved-date">
              Saved {new Date(flight.savedAt).toLocaleDateString()}
            </p>
            <FlightCard
              flight={flight}
              isFavorite={true}
              onToggleFavorite={() => onRemove(flight)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
