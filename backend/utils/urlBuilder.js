/**
 * Builds a Google Flights URL using a natural language query.
 * Avoids the undocumented protobuf-encoded `tfs` parameter.
 */
export function buildGoogleFlightsUrl({ origin, destination, date }) {
  const query = `Flights from ${origin} to ${destination} on ${date}`;
  const encoded = encodeURIComponent(query);
  return `https://www.google.com/travel/flights?q=${encoded}`;
}
