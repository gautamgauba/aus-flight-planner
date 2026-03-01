import './FlightCard.css';

export default function FlightCard({ flight, isFavorite, onToggleFavorite }) {
  const { airline, departureTime, arrivalTime, duration, stops, stopsLabel, price, priceDisplay } = flight;

  const stopsClass = stops === 0 ? 'nonstop' : stops === 1 ? 'one-stop' : 'multi-stop';
  const stopsDisplay = stopsLabel
    ? stopsLabel.charAt(0).toUpperCase() + stopsLabel.slice(1)
    : stops === 0 ? 'Nonstop' : stops !== null ? `${stops} stop(s)` : '--';

  return (
    <div className="flight-card">
      <div className="flight-card__airline">
        {airline || 'Unknown Airline'}
      </div>

      <div className="flight-card__times">
        <span className="time">{departureTime || '--'}</span>
        <span className="arrow">&#8594;</span>
        <span className="time">{arrivalTime || '--'}</span>
      </div>

      <div className="flight-card__details">
        <span className="duration">{duration || '--'}</span>
        <span className={`stops-badge ${stopsClass}`}>{stopsDisplay}</span>
      </div>

      <div className="flight-card__right">
        <span className="price">{priceDisplay || (price ? `$${price}` : 'N/A')}</span>
        <button
          className={`save-btn ${isFavorite ? 'saved' : ''}`}
          onClick={onToggleFavorite}
        >
          {isFavorite ? 'Saved' : 'Save'}
        </button>
      </div>
    </div>
  );
}
