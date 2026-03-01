import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 90000, // Playwright scraping can take up to 60s
});

export async function searchFlights({ destination, date, tripType, returnDate, cabin, maxPrice, stops }) {
  const params = { destination, date };
  if (tripType) params.tripType = tripType;
  if (returnDate) params.returnDate = returnDate;
  if (cabin && cabin !== 'economy') params.cabin = cabin;
  if (maxPrice) params.maxPrice = maxPrice;
  if (stops && stops !== 'any') params.stops = stops;

  const response = await api.get('/flights', { params });
  return response.data;
}
