import express from 'express';
import { scrapeFareCalendar } from '../scraper/fareCalendarScraper.js';

const router = express.Router();

// GET /api/fare-calendar?destination=DEL&month=2026-03&cabin=business&tripType=one-way
router.get('/', async (req, res, next) => {
  try {
    const { destination, month, cabin = 'economy', tripType = 'one-way' } = req.query;

    if (!destination) return res.status(400).json({ error: 'destination is required' });
    if (!month) return res.status(400).json({ error: 'month is required (YYYY-MM)' });
    if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: 'month must be YYYY-MM' });

    const [year, monthNum] = month.split('-').map(Number);

    const days = await scrapeFareCalendar({ destination, year, month: monthNum, cabin, tripType });

    res.json({ destination, month, cabin, tripType, days });
  } catch (err) {
    next(err);
  }
});

export default router;
