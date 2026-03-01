import express from 'express';
import { scrapeFlights } from '../scraper/googleFlightsScraper.js';
import { buildGoogleFlightsUrl } from '../utils/urlBuilder.js';

const router = express.Router();

// GET /api/flights?destination=LAX&date=2026-03-15&tripType=round-trip&returnDate=2026-03-22&cabin=business
router.get('/', async (req, res, next) => {
  try {
    const { destination, date, tripType = 'one-way', returnDate, cabin = 'economy', maxPrice, stops } = req.query;

    if (!destination) return res.status(400).json({ error: 'destination is required' });
    if (!date) return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
    if (tripType === 'round-trip' && !returnDate) return res.status(400).json({ error: 'returnDate is required for round-trip' });

    const url = buildGoogleFlightsUrl({
      origin: 'AUS',
      destination: destination.toUpperCase(),
      date,
      tripType,
      returnDate,
      cabin,
    });

    const flights = await scrapeFlights(url);

    let results = flights;
    if (maxPrice) {
      const max = parseFloat(maxPrice);
      results = results.filter(f => f.price === null || f.price <= max);
    }
    if (stops === '0') {
      results = results.filter(f => f.stops === 0);
    } else if (stops === '1') {
      results = results.filter(f => f.stops !== null && f.stops <= 1);
    }

    res.json({
      origin: 'AUS',
      destination: destination.toUpperCase(),
      date,
      returnDate: returnDate || null,
      tripType,
      cabin,
      count: results.length,
      flights: results,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
