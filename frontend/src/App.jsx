import { useState } from 'react';
import SearchForm from './components/SearchForm/SearchForm.jsx';
import FilterPanel from './components/FilterPanel/FilterPanel.jsx';
import FlightCard from './components/FlightCard/FlightCard.jsx';
import FavoritesPanel from './components/FavoritesPanel/FavoritesPanel.jsx';
import LoadingSpinner from './components/LoadingSpinner/LoadingSpinner.jsx';
import ErrorMessage from './components/ErrorMessage/ErrorMessage.jsx';
import { useFlightSearch } from './hooks/useFlightSearch.js';
import { useFavorites } from './hooks/useFavorites.js';
import './App.css';

export default function App() {
  const { flights, loading, error, searchMeta, search } = useFlightSearch();
  const { favorites, addFavorite, removeFavorite, isFavorite } = useFavorites();
  const [filters, setFilters] = useState({ maxPrice: 2000, stops: 'any' });
  const [showFavorites, setShowFavorites] = useState(false);

  const filteredFlights = flights.filter(flight => {
    const priceOk = flight.price === null || flight.price <= filters.maxPrice;
    const stopsOk =
      filters.stops === 'any' ||
      (filters.stops === '0' && flight.stops === 0) ||
      (filters.stops === '1' && flight.stops !== null && flight.stops <= 1);
    return priceOk && stopsOk;
  });

  const handleSearch = (formValues) => {
    search(formValues);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div>
            <h1>AUS Flight Finder</h1>
            <p className="subtitle">Flights from Austin, TX (AUS) to anywhere</p>
          </div>
          <button
            className="favorites-toggle"
            onClick={() => setShowFavorites(v => !v)}
          >
            {showFavorites ? 'Back to Search' : `Saved Flights (${favorites.length})`}
          </button>
        </div>
      </header>

      {showFavorites ? (
        <FavoritesPanel favorites={favorites} onRemove={removeFavorite} />
      ) : (
        <main className="app-main">
          <SearchForm onSearch={handleSearch} loading={loading} />

          {loading && <LoadingSpinner message="Searching Google Flights... this may take up to 30 seconds." />}
          {error && <ErrorMessage message={error} />}

          {flights.length > 0 && !loading && (
            <FilterPanel filters={filters} onChange={setFilters} />
          )}

          {searchMeta && !loading && (
            <p className="results-meta">
              Showing {filteredFlights.length} of {searchMeta.count}{' '}
              {searchMeta.cabin !== 'economy' ? searchMeta.cabin.replace('_', ' ') + ' ' : ''}
              {searchMeta.tripType === 'round-trip' ? 'round-trip' : 'one-way'} flights
              · {searchMeta.origin} → {searchMeta.destination}
              · {searchMeta.date}{searchMeta.returnDate ? ` – ${searchMeta.returnDate}` : ''}
            </p>
          )}

          <div className="flight-list">
            {filteredFlights.map((flight, idx) => (
              <FlightCard
                key={idx}
                flight={flight}
                isFavorite={isFavorite(flight)}
                onToggleFavorite={() =>
                  isFavorite(flight) ? removeFavorite(flight) : addFavorite(flight)
                }
              />
            ))}
          </div>
        </main>
      )}
    </div>
  );
}
