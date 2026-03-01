import express from 'express';
import { scrapeFlights } from '../scraper/googleFlightsScraper.js';
import { buildGoogleFlightsUrl } from '../utils/urlBuilder.js';

const router = express.Router();

// GET /api/flights?destination=LAX&date=2025-07-15&maxPrice=500&stops=0
router.get('/', async (req, res, next) => {
  try {
    const { destination, date, maxPrice, stops } = req.query;

    if (!destination) {
      return res.status(400).json({ error: 'destination is required' });
    }
    if (!date) {
      return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'date must be in YYYY-MM-DD format' });
    }

    const url = buildGoogleFlightsUrl({
      origin: 'AUS',
      destination: destination.toUpperCase(),
      date,
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
      count: results.length,
      flights: results,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
