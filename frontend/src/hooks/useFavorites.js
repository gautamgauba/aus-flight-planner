import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'flightPlanner_favorites';

function generateId(flight) {
  return `${flight.airline}-${flight.departureTime}-${flight.price}`;
}

export function useFavorites() {
  const [favorites, setFavorites] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const addFavorite = useCallback((flight) => {
    setFavorites(prev => {
      const id = generateId(flight);
      if (prev.some(f => generateId(f) === id)) return prev;
      return [...prev, { ...flight, savedAt: new Date().toISOString() }];
    });
  }, []);

  const removeFavorite = useCallback((flight) => {
    const id = generateId(flight);
    setFavorites(prev => prev.filter(f => generateId(f) !== id));
  }, []);

  const isFavorite = useCallback((flight) => {
    const id = generateId(flight);
    return favorites.some(f => generateId(f) === id);
  }, [favorites]);

  return { favorites, addFavorite, removeFavorite, isFavorite };
}
