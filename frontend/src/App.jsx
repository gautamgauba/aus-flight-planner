import { useState } from 'react';
import SearchForm from './components/SearchForm/SearchForm.jsx';
import FilterPanel from './components/FilterPanel/FilterPanel.jsx';
import FlightCard from './components/FlightCard/FlightCard.jsx';
import FavoritesPanel from './components/FavoritesPanel/FavoritesPanel.jsx';
import FareCalendar from './components/FareCalendar/FareCalendar.jsx';
import LoadingSpinner from './components/LoadingSpinner/LoadingSpinner.jsx';
import ErrorMessage from './components/ErrorMessage/ErrorMessage.jsx';
import { useFlightSearch } from './hooks/useFlightSearch.js';
import { useFavorites } from './hooks/useFavorites.js';
import './App.css';

const TABS = [
  { id: 'search', label: 'Search Flights' },
  { id: 'calendar', label: 'Fare Calendar' },
  { id: 'favorites', label: 'Saved Flights' },
];

export default function App() {
  const { flights, loading, error, searchMeta, search } = useFlightSearch();
  const { favorites, addFavorite, removeFavorite, isFavorite } = useFavorites();
  const [filters, setFilters] = useState({ maxPrice: 2000, stops: 'any' });
  const [activeTab, setActiveTab] = useState('search');

  const filteredFlights = flights.filter(flight => {
    const priceOk = flight.price === null || flight.price <= filters.maxPrice;
    const stopsOk =
      filters.stops === 'any' ||
      (filters.stops === '0' && flight.stops === 0) ||
      (filters.stops === '1' && flight.stops !== null && flight.stops <= 1);
    return priceOk && stopsOk;
  });

  // When user clicks a calendar day, switch to search tab and run search
  const handleCalendarDateSelect = ({ destination, date, cabin, tripType }) => {
    setActiveTab('search');
    search({ destination, date, cabin, tripType });
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div>
            <h1>AUS Flight Finder</h1>
            <p className="subtitle">Flights from Austin, TX (AUS) to anywhere</p>
          </div>
        </div>
        <nav className="app-tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {tab.id === 'favorites' && favorites.length > 0 && (
                <span className="tab-badge">{favorites.length}</span>
              )}
            </button>
          ))}
        </nav>
      </header>

      {activeTab === 'favorites' && (
        <FavoritesPanel favorites={favorites} onRemove={removeFavorite} />
      )}

      {activeTab === 'calendar' && (
        <main className="app-main">
          <FareCalendar onSelectDate={handleCalendarDateSelect} />
        </main>
      )}

      {activeTab === 'search' && (
        <main className="app-main">
          <SearchForm onSearch={search} loading={loading} />

          {loading && <LoadingSpinner message="Searching Google Flights... this may take up to 30 seconds." />}
          {error && <ErrorMessage message={error} />}

          {flights.length > 0 && !loading && (
            <FilterPanel filters={filters} onChange={setFilters} />
          )}

          {searchMeta && !loading && (
            <p className="results-meta">
              Showing {filteredFlights.length} of {searchMeta.count}{' '}
              {searchMeta.cabin && searchMeta.cabin !== 'economy' ? searchMeta.cabin.replace('_', ' ') + ' ' : ''}
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
