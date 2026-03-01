import { getBrowser, createContext } from './browserManager.js';
import { SELECTORS } from './selectors.js';

const GOOGLE_FLIGHTS_BASE = 'https://www.google.com/travel/flights';

export async function scrapeFlights(url) {
  const browser = await getBrowser();
  const context = await createContext(browser);
  const page = await context.newPage();

  try {
    // Block images, fonts, and analytics to speed up scraping
    await page.route('**/*.{png,jpg,gif,webp,svg,woff,woff2,ttf,eot}', route => route.abort());
    await page.route('**/analytics/**', route => route.abort());
    await page.route('**/gtag/**', route => route.abort());

    await page.goto(GOOGLE_FLIGHTS_BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await randomDelay(1000, 2000);

    await dismissConsentDialog(page);
    await setOneWayTrip(page);
    await fillSearchForm(page, url);

    return await waitForAndExtractResults(page);
  } finally {
    await context.close();
  }
}

async function dismissConsentDialog(page) {
  try {
    const btn = page.locator('button:has-text("Accept all"), button:has-text("Reject all")').first();
    if (await btn.isVisible({ timeout: 3000 })) {
      await btn.click();
      await randomDelay(500, 1000);
    }
  } catch { /* no dialog */ }
}

async function setOneWayTrip(page) {
  try {
    // Click the trip-type button (shows "Round trip" by default)
    const tripBtn = page.locator('div[jsname="UMoFte"]').first();
    if (await tripBtn.isVisible({ timeout: 3000 })) {
      await tripBtn.click();
      await randomDelay(300, 600);
      // "One way" is data-value="2" in Google's dropdown
      await page.locator('[data-value="2"]').first().click({ timeout: 5000 });
      await randomDelay(300, 600);
    }
  } catch (err) {
    console.warn('[Scraper] Could not set one-way mode:', err.message);
  }
}

async function fillSearchForm(page, url) {
  const urlObj = new URL(url);
  const query = decodeURIComponent(urlObj.searchParams.get('q') || '');
  const destination = query.match(/to (\S+) on/)?.[1] || '';
  const rawDate = query.match(/on (\d{4}-\d{2}-\d{2})/)?.[1] || '';
  const date = rawDate ? formatDateForGoogle(rawDate) : '';

  // Fill origin
  const fromInput = page.locator(SELECTORS.fromInput).first();
  await fromInput.click({ timeout: 10000 });
  await fromInput.selectText();
  await page.keyboard.type('Austin', { delay: 80 });
  await randomDelay(800, 1200);

  const austinOption = page.locator('li[role="option"]').filter({ hasText: /Austin.*AUS/i }).first();
  if (await austinOption.isVisible({ timeout: 5000 })) {
    await austinOption.click();
  } else {
    await page.keyboard.press('Enter');
  }
  await randomDelay(500, 1000);

  // Fill destination
  const toInput = page.locator(SELECTORS.toInput).first();
  await toInput.click({ timeout: 10000 });
  await page.keyboard.type(destination, { delay: 80 });
  await randomDelay(800, 1200);

  const destOption = page.locator('li[role="option"]').first();
  if (await destOption.isVisible({ timeout: 5000 })) {
    await destOption.click();
  } else {
    await page.keyboard.press('Enter');
  }
  await randomDelay(500, 1000);

  // Fill date
  if (date) {
    const dateInput = page.locator(SELECTORS.departureDateInput).first();
    await dateInput.click({ timeout: 10000 });
    await dateInput.fill('');
    await page.keyboard.type(date, { delay: 60 });
    await randomDelay(400, 800);
    await page.keyboard.press('Enter');
    await randomDelay(300, 600);
  }

  // Submit search
  const searchBtn = page.locator(SELECTORS.searchButton).first();
  await searchBtn.click({ timeout: 10000 });
}

async function waitForAndExtractResults(page) {
  try {
    await page.waitForSelector(SELECTORS.flightCard, { timeout: 30000, state: 'visible' });
  } catch {
    throw new Error('Could not load flight results. Google may have blocked the request — try again later.');
  }

  await randomDelay(2000, 3000);

  const cards = await page.locator(SELECTORS.flightCard).all();
  const flights = [];

  for (const card of cards) {
    try {
      const flight = await extractFlightData(card);
      if (flight.price !== null || flight.airline) {
        flights.push(flight);
      }
    } catch (err) {
      console.warn('[Scraper] Failed to parse flight card:', err.message);
    }
  }

  return flights;
}

async function extractFlightData(card) {
  // Airline
  let airline = null;
  try {
    const el = card.locator(SELECTORS.airline).first();
    airline = (await el.innerText({ timeout: 3000 })).split('\n')[0].trim();
  } catch {
    try {
      airline = await card.locator(SELECTORS.airlineLogo).first().getAttribute('alt');
    } catch { /* leave null */ }
  }

  // Departure & arrival times
  let departureTime = null;
  let arrivalTime = null;
  try {
    const spans = await card.locator(SELECTORS.timeSpans).all();
    if (spans.length >= 2) {
      departureTime = (await spans[0].innerText()).trim();
      arrivalTime = (await spans[1].innerText()).trim();
    }
  } catch {
    try {
      departureTime = await card.locator(SELECTORS.departureTimeAria).first().innerText();
      arrivalTime = await card.locator(SELECTORS.arrivalTimeAria).first().innerText();
    } catch { /* leave null */ }
  }

  // Duration
  let duration = null;
  try {
    duration = (await card.locator(SELECTORS.duration).first().innerText({ timeout: 2000 })).trim();
  } catch { /* leave null */ }

  // Stops
  let stops = null;
  let stopsLabel = null;
  try {
    stopsLabel = (await card.locator(SELECTORS.stopsText).first().innerText({ timeout: 2000 })).trim().toLowerCase();
    if (stopsLabel.includes('nonstop')) {
      stops = 0;
    } else if (stopsLabel.includes('1 stop')) {
      stops = 1;
    } else {
      const m = stopsLabel.match(/(\d+)/);
      stops = m ? parseInt(m[1], 10) : null;
    }
  } catch { /* leave null */ }

  // Price
  let price = null;
  let priceDisplay = null;
  try {
    priceDisplay = (await card.locator(SELECTORS.priceText).first().innerText({ timeout: 2000 })).trim();
    price = parsePrice(priceDisplay);
  } catch {
    try {
      priceDisplay = (await card.locator(SELECTORS.priceContainer).first().innerText({ timeout: 2000 })).trim();
      price = parsePrice(priceDisplay);
    } catch { /* leave null */ }
  }

  return { airline, departureTime, arrivalTime, duration, stops, stopsLabel, price, priceDisplay };
}

function parsePrice(text) {
  if (!text) return null;
  const num = parseFloat(text.replace(/[^0-9.]/g, ''));
  return isNaN(num) ? null : num;
}

function formatDateForGoogle(isoDate) {
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function randomDelay(min, max) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, ms));
}
