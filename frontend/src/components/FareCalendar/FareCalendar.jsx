import { useState } from 'react';
import './FareCalendar.css';

const CABIN_OPTIONS = [
  { value: 'economy', label: 'Economy' },
  { value: 'premium_economy', label: 'Premium Economy' },
  { value: 'business', label: 'Business' },
  { value: 'first', label: 'First Class' },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getMonthGrid(year, month) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function getPriceColor(price, min, max) {
  if (!price) return '';
  if (min === max) return 'price-mid';
  const ratio = (price - min) / (max - min);
  if (ratio < 0.33) return 'price-low';
  if (ratio < 0.66) return 'price-mid';
  return 'price-high';
}

export default function FareCalendar({ onSelectDate }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [destination, setDestination] = useState('Delhi, India');
  const [cabin, setCabin] = useState('business');
  const [tripType, setTripType] = useState('one-way');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [priceMap, setPriceMap] = useState({});
  const [searched, setSearched] = useState(false);

  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const grid = getMonthGrid(year, month);

  const prices = Object.values(priceMap).filter(p => p.price !== null).map(p => p.price);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;

  const goToPrevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
    setPriceMap({});
    setSearched(false);
  };
  const goToNextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
    setPriceMap({});
    setSearched(false);
  };

  const handleSearch = async () => {
    if (!destination.trim()) return;
    setLoading(true);
    setError(null);
    setPriceMap({});
    setSearched(true);

    try {
      const params = new URLSearchParams({ destination: destination.trim(), month: monthStr, cabin, tripType });
      const res = await fetch(`/api/fare-calendar?${params}`, { signal: AbortSignal.timeout(120000) });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to load calendar');
      }
      const data = await res.json();
      const map = {};
      for (const day of data.days) map[day.date] = day;
      setPriceMap(map);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDayClick = (day) => {
    if (!day) return;
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayData = priceMap[dateStr];
    if (onSelectDate) onSelectDate({ destination: destination.trim(), date: dateStr, cabin, tripType, price: dayData?.price });
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="fare-calendar">
      <div className="fare-calendar__controls">
        <div className="fc-row">
          <div className="fc-field">
            <label>Destination</label>
            <input
              type="text"
              value={destination}
              onChange={e => setDestination(e.target.value)}
              placeholder="e.g. Delhi, India or LAX"
            />
          </div>
          <div className="fc-field fc-field--sm">
            <label>Cabin</label>
            <select value={cabin} onChange={e => setCabin(e.target.value)}>
              {CABIN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="fc-field fc-field--sm">
            <label>Trip</label>
            <select value={tripType} onChange={e => setTripType(e.target.value)}>
              <option value="one-way">One Way</option>
              <option value="round-trip">Round Trip</option>
            </select>
          </div>
          <button className="fc-search-btn" onClick={handleSearch} disabled={loading}>
            {loading ? 'Loading...' : 'Find Lowest Fares'}
          </button>
        </div>
      </div>

      <div className="fare-calendar__grid-wrap">
        <div className="fc-month-nav">
          <button onClick={goToPrevMonth}>&#8592;</button>
          <span className="fc-month-label">{monthLabel}</span>
          <button onClick={goToNextMonth}>&#8594;</button>
        </div>

        {loading && (
          <div className="fc-loading">
            <div className="fc-spinner" />
            <p>Scanning Google Flights for {monthLabel} prices... this may take ~30 seconds.</p>
          </div>
        )}

        {error && <div className="fc-error">Error: {error}</div>}

        {!loading && (
          <>
            <div className="fc-day-headers">
              {DAYS.map(d => <div key={d} className="fc-day-name">{d}</div>)}
            </div>
            <div className="fc-grid">
              {grid.map((day, i) => {
                if (!day) return <div key={`empty-${i}`} className="fc-cell fc-cell--empty" />;
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isPast = dateStr < today;
                const dayData = priceMap[dateStr];
                const colorClass = dayData?.price ? getPriceColor(dayData.price, minPrice, maxPrice) : '';
                const isLowest = dayData?.price && dayData.price === minPrice && searched;

                return (
                  <div
                    key={dateStr}
                    className={`fc-cell ${colorClass} ${isPast ? 'fc-cell--past' : ''} ${searched && !isPast ? 'fc-cell--clickable' : ''} ${isLowest ? 'fc-cell--best' : ''}`}
                    onClick={() => !isPast && searched && handleDayClick(day)}
                    title={dayData?.price ? `${dayData.priceDisplay} — click to search this date` : ''}
                  >
                    <span className="fc-day-num">{day}</span>
                    {dayData?.price && <span className="fc-price">{dayData.priceDisplay}</span>}
                    {dayData?.price === null && searched && !isPast && <span className="fc-no-price">—</span>}
                    {isLowest && <span className="fc-best-badge">Best</span>}
                  </div>
                );
              })}
            </div>

            {searched && !loading && prices.length > 0 && (
              <div className="fc-legend">
                <span className="legend-item price-low">Lowest</span>
                <span className="legend-item price-mid">Mid</span>
                <span className="legend-item price-high">Highest</span>
                <span className="legend-summary">
                  Best: <strong>{priceMap[Object.keys(priceMap).find(k => priceMap[k].price === minPrice)]?.priceDisplay}</strong>
                  &nbsp;· Avg: <strong>${Math.round(prices.reduce((a, b) => a + b, 0) / prices.length).toLocaleString()}</strong>
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
