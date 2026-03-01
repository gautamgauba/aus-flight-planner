const CABIN_LABELS = {
  economy: 'economy',
  premium_economy: 'premium economy',
  business: 'business class',
  first: 'first class',
};

/**
 * Builds a Google Flights natural-language query URL.
 * Supports one-way, round-trip, cabin class, and return date.
 */
export function buildGoogleFlightsUrl({ origin, destination, date, tripType = 'one-way', returnDate, cabin = 'economy' }) {
  const cabinLabel = CABIN_LABELS[cabin] || 'economy';
  const tripLabel = tripType === 'round-trip' ? 'round trip' : 'one way';

  let query = `${cabinLabel} ${tripLabel} flights from ${origin} to ${destination} on ${date}`;
  if (tripType === 'round-trip' && returnDate) {
    query += ` returning ${returnDate}`;
  }

  return `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}`;
}
