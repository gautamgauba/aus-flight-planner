import { useState, useCallback } from 'react';
import { searchFlights } from '../api/flightsApi.js';

export function useFlightSearch() {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchMeta, setSearchMeta] = useState(null);

  const search = useCallback(async (searchParams) => {
    setLoading(true);
    setError(null);
    setFlights([]);

    try {
      const data = await searchFlights(searchParams);
      setFlights(data.flights || []);
      setSearchMeta({
        origin: data.origin,
        destination: data.destination,
        date: data.date,
        returnDate: data.returnDate,
        tripType: data.tripType,
        cabin: data.cabin,
        count: data.count,
      });
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Search failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { flights, loading, error, searchMeta, search };
}
