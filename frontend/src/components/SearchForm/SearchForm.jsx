import { useState } from 'react';
import './SearchForm.css';

const today = new Date().toISOString().split('T')[0];

export default function SearchForm({ onSearch, loading }) {
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!destination.trim() || !date) return;
    onSearch({ destination: destination.trim().toUpperCase(), date });
  };

  return (
    <form className="search-form" onSubmit={handleSubmit}>
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
          <label htmlFor="date">Departure Date</label>
          <input
            id="date"
            type="date"
            value={date}
            min={today}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <button type="submit" disabled={loading} className="search-button">
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>
    </form>
  );
}
