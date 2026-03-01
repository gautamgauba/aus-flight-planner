import './FilterPanel.css';

export default function FilterPanel({ filters, onChange }) {
  return (
    <div className="filter-panel">
      <h3>Filter Results</h3>

      <div className="filter-group">
        <label htmlFor="max-price">
          Max Price: <strong>${filters.maxPrice.toLocaleString()}</strong>
        </label>
        <input
          id="max-price"
          type="range"
          min={50}
          max={3000}
          step={50}
          value={filters.maxPrice}
          onChange={(e) => onChange(prev => ({ ...prev, maxPrice: Number(e.target.value) }))}
        />
        <div className="range-labels">
          <span>$50</span>
          <span>$3,000</span>
        </div>
      </div>

      <div className="filter-group">
        <label htmlFor="stops-filter">Stops</label>
        <select
          id="stops-filter"
          value={filters.stops}
          onChange={(e) => onChange(prev => ({ ...prev, stops: e.target.value }))}
        >
          <option value="any">Any</option>
          <option value="0">Nonstop only</option>
          <option value="1">1 stop or fewer</option>
        </select>
      </div>
    </div>
  );
}
