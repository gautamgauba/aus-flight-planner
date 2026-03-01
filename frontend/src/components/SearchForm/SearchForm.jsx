import { useState } from 'react';
import './SearchForm.css';

const today = new Date().toISOString().split('T')[0];

const CABIN_OPTIONS = [
  { value: 'economy', label: 'Economy' },
  { value: 'premium_economy', label: 'Premium Economy' },
  { value: 'business', label: 'Business' },
  { value: 'first', label: 'First Class' },
];

export default function SearchForm({ onSearch, loading }) {
  const [tripType, setTripType] = useState('one-way');
  const [destination, setDestination] = useState('Delhi, India');
  const [date, setDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [cabin, setCabin] = useState('economy');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!destination.trim() || !date) return;
    if (tripType === 'round-trip' && !returnDate) return;
    onSearch({
      destination: destination.trim().toUpperCase(),
      date,
      tripType,
      returnDate: tripType === 'round-trip' ? returnDate : undefined,
      cabin,
    });
  };

  return (
    <form className="search-form" onSubmit={handleSubmit}>
      <div className="form-options-row">
        <div className="trip-type-toggle">
          <button
            type="button"
            className={`trip-btn ${tripType === 'one-way' ? 'active' : ''}`}
            onClick={() => setTripType('one-way')}
          >
            One Way
          </button>
          <button
            type="button"
            className={`trip-btn ${tripType === 'round-trip' ? 'active' : ''}`}
            onClick={() => setTripType('round-trip')}
          >
            Round Trip
          </button>
        </div>

        <div className="form-group cabin-group">
          <select
            id="cabin"
            value={cabin}
            onChange={(e) => setCabin(e.target.value)}
          >
            {CABIN_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>From</label>
          <input
            type="text"
            value="Austin, TX (AUS)"
            disabled
            className="input-disabled"
          />
        </div>

        <div className="form-group">
          <label htmlFor="destination">To</label>
          <input
            id="destination"
            type="text"
            placeholder="e.g. LAX, JFK, London"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            required
            autoComplete="off"
          />
        </div>

        <div className="form-group">
          <label htmlFor="date">Departure</label>
          <input
            id="date"
            type="date"
            value={date}
            min={today}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        {tripType === 'round-trip' && (
          <div className="form-group">
            <label htmlFor="return-date">Return</label>
            <input
              id="return-date"
              type="date"
              value={returnDate}
              min={date || today}
              onChange={(e) => setReturnDate(e.target.value)}
              required
            />
          </div>
        )}

        <button type="submit" disabled={loading} className="search-button">
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>
    </form>
  );
}
