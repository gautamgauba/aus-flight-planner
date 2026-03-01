import { getBrowser, createContext } from './browserManager.js';
import { SELECTORS } from './selectors.js';

const GOOGLE_FLIGHTS_BASE = 'https://www.google.com/travel/flights';

export async function scrapeFlights(url) {
  const browser = await getBrowser();
  const context = await createContext(browser);
  const page = await context.newPage();

  // Parse destination and date from our URL
  const urlObj = new URL(url);
  const query = decodeURIComponent(urlObj.searchParams.get('q') || '');
  const destination = query.match(/to (.+?) on \d{4}/)?.[1]?.trim() || '';
  const rawDate = query.match(/on (\d{4}-\d{2}-\d{2})/)?.[1] || '';
  const date = rawDate ? formatDateForGoogle(rawDate) : '';

  console.log(`[Scraper] Searching: AUS -> ${destination} on ${date}`);

  // Intercept Google's internal flight data API responses
  let interceptedFlights = null;
  page.on('response', async (response) => {
    const respUrl = response.url();
    // Google Flights loads data via a specific internal endpoint
    if (respUrl.includes('travel/flights') && respUrl.includes('search') &&
        response.headers()['content-type']?.includes('json')) {
      try {
        const text = await response.text();
        const parsed = tryParseFlightData(text);
        if (parsed && parsed.length > 0) {
          interceptedFlights = parsed;
          console.log(`[Scraper] Intercepted ${parsed.length} flights from API response`);
        }
      } catch { /* not parseable, skip */ }
    }
  });

  try {
    // Block images, fonts, and analytics
    await page.route('**/*.{png,jpg,gif,webp,svg,woff,woff2,ttf,eot}', route => route.abort());
    await page.route('**/analytics/**', route => route.abort());
    await page.route('**/gtag/**', route => route.abort());

    // Strategy 1: Navigate directly to results URL (skip form interaction)
    const directUrl = buildDirectFlightsUrl(destination, rawDate);
    console.log('[Scraper] Navigating directly to:', directUrl.slice(0, 80));
    await page.goto(directUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await randomDelay(2000, 3000);
    await dismissConsentDialog(page);

    // Check if results loaded directly
    let flights = await waitForResults(page, interceptedFlights, 20000);
    if (flights.length > 0) return flights;

    // Strategy 2: Fall back to form interaction
    console.log('[Scraper] Direct URL failed, trying form interaction...');
    await page.goto(GOOGLE_FLIGHTS_BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await randomDelay(1500, 2500);
    await dismissConsentDialog(page);
    await setOneWayTrip(page);
    await fillSearchForm(page, destination, rawDate, date);

    flights = await waitForResults(page, interceptedFlights, 45000);
    if (flights.length > 0) return flights;

    throw new Error('Could not load flight results. Google may have blocked the request — try again later.');
  } finally {
    await context.close();
  }
}

// Build a direct Google Flights results URL using the simpler /search path
function buildDirectFlightsUrl(destination, rawDate) {
  const q = encodeURIComponent(`Flights from Austin to ${destination} on ${rawDate}`);
  return `https://www.google.com/travel/flights?q=${q}`;
}

async function waitForResults(page, interceptedFlightsRef, timeout = 45000) {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    // Check if we intercepted API data
    if (interceptedFlightsRef && interceptedFlightsRef.length > 0) {
      return interceptedFlightsRef;
    }

    // Try DOM extraction with multiple selectors
    for (const sel of ['li.pIav2d', 'li[class*="pIav"]', 'ul.Rk10dc > li']) {
      try {
        const cards = await page.locator(sel).all();
        if (cards.length > 0) {
          console.log(`[Scraper] Found ${cards.length} flight cards via DOM selector: ${sel}`);
          return await extractFromDOM(page, sel);
        }
      } catch { /* selector not found yet */ }
    }

    await randomDelay(1500, 2000);
  }

  // Final debug screenshot
  await page.screenshot({ path: '/tmp/scraper-debug.png', fullPage: false });
  console.error('[Scraper] Timed out. URL:', page.url());
  console.error('[Scraper] Screenshot saved to /tmp/scraper-debug.png');
  return [];  // Return empty so caller can try next strategy
}

async function extractFromDOM(page, selector) {
  await randomDelay(1000, 2000);
  const cards = await page.locator(selector).all();
  const flights = [];

  for (const card of cards) {
    try {
      const flight = await extractFlightData(card);
      if (flight.price !== null || flight.airline) flights.push(flight);
    } catch (err) {
      console.warn('[Scraper] Failed to parse card:', err.message);
    }
  }
  return flights;
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
    const tripBtn = page.locator('div[jsname="UMoFte"]').first();
    if (await tripBtn.isVisible({ timeout: 3000 })) {
      await tripBtn.click();
      await randomDelay(300, 600);
      await page.locator('[data-value="2"]').first().click({ timeout: 5000 });
      await randomDelay(300, 600);
    }
  } catch (err) {
    console.warn('[Scraper] Could not set one-way mode:', err.message);
  }
}

async function fillSearchForm(page, destination, rawDate, date) {
  // Fill origin
  const fromInput = page.locator(SELECTORS.fromInput).first();
  await fromInput.click({ timeout: 10000 });
  await fromInput.click({ clickCount: 3 });
  await page.keyboard.type('Austin TX', { delay: 60 });
  await randomDelay(1000, 1500);

  try {
    const austinOption = page.locator('li[role="option"]').filter({ hasText: /Austin/i }).first();
    await austinOption.waitFor({ state: 'visible', timeout: 6000 });
    await austinOption.click();
  } catch {
    await page.keyboard.press('Enter');
  }
  await randomDelay(600, 1000);

  // Fill destination — try clicking or tab to it
  let toFocused = false;
  for (const selector of [
    SELECTORS.toInput,
    'input[placeholder*="Where to"]',
    'input[aria-label*="Destination"]',
  ]) {
    try {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 3000 })) {
        await el.click({ timeout: 5000 });
        toFocused = true;
        break;
      }
    } catch { /* try next */ }
  }
  if (!toFocused) await page.keyboard.press('Tab');

  await page.keyboard.type(destination, { delay: 70 });
  await randomDelay(1000, 1500);

  try {
    const destOption = page.locator('li[role="option"]').first();
    await destOption.waitFor({ state: 'visible', timeout: 6000 });
    await destOption.click();
  } catch {
    await page.keyboard.press('Enter');
  }
  await randomDelay(600, 1000);

  // Fill date — open calendar, click the date cell, click Done
  if (rawDate) {
    for (const selector of [SELECTORS.departureDateInput, 'input[aria-label*="Departure"]']) {
      try {
        const el = page.locator(selector).first();
        if (await el.isVisible({ timeout: 3000 })) {
          await el.click({ timeout: 5000 });
          await randomDelay(600, 1000);
          break;
        }
      } catch { /* try next */ }
    }

    // Click the specific date cell in the calendar
    const dateObj = new Date(rawDate + 'T00:00:00');
    const ariaLabel = dateObj.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    console.log(`[Scraper] Clicking calendar date: "${ariaLabel}"`);

    try {
      const dateCell = page.locator(`[aria-label="${ariaLabel}"]`).first();
      await dateCell.waitFor({ state: 'visible', timeout: 6000 });
      await dateCell.click();
      await randomDelay(400, 700);
    } catch {
      console.warn('[Scraper] Calendar date cell not found, typing date instead');
      await page.keyboard.type(date, { delay: 60 });
      await randomDelay(400, 700);
      await page.keyboard.press('Enter');
      await randomDelay(300, 500);
    }

    // Click Done to close calendar
    try {
      const doneBtn = page.locator('button:has-text("Done")').first();
      await doneBtn.waitFor({ state: 'visible', timeout: 4000 });
      await doneBtn.click();
      await randomDelay(400, 700);
    } catch { /* Done button may not appear */ }
  }

  await randomDelay(800, 1200);

  // Click Search
  for (const selector of [SELECTORS.searchButton, 'button[aria-label*="Search"]', 'button:has-text("Search")']) {
    try {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 3000 })) {
        await Promise.all([
          page.waitForURL('**/travel/flights**tfs**', { timeout: 15000 }).catch(() => {}),
          btn.click({ timeout: 8000 }),
        ]);
        console.log('[Scraper] Search submitted, navigating to results...');
        break;
      }
    } catch { /* try next */ }
  }
}

async function extractFlightData(card) {
  let airline = null;
  try {
    airline = (await card.locator(SELECTORS.airline).first().innerText({ timeout: 3000 })).split('\n')[0].trim();
  } catch {
    try { airline = await card.locator(SELECTORS.airlineLogo).first().getAttribute('alt'); } catch {}
  }

  let departureTime = null, arrivalTime = null;
  try {
    const spans = await card.locator(SELECTORS.timeSpans).all();
    if (spans.length >= 2) {
      departureTime = (await spans[0].innerText()).trim();
      arrivalTime = (await spans[1].innerText()).trim();
    }
  } catch {}

  let duration = null;
  try { duration = (await card.locator(SELECTORS.duration).first().innerText({ timeout: 2000 })).trim(); } catch {}

  let stops = null, stopsLabel = null;
  try {
    stopsLabel = (await card.locator(SELECTORS.stopsText).first().innerText({ timeout: 2000 })).trim().toLowerCase();
    stops = stopsLabel.includes('nonstop') ? 0 : stopsLabel.includes('1 stop') ? 1 : parseInt(stopsLabel.match(/(\d+)/)?.[1]) || null;
  } catch {}

  let price = null, priceDisplay = null;
  try {
    priceDisplay = (await card.locator(SELECTORS.priceText).first().innerText({ timeout: 2000 })).trim();
    price = parsePrice(priceDisplay);
  } catch {
    try {
      priceDisplay = (await card.locator(SELECTORS.priceContainer).first().innerText({ timeout: 2000 })).trim();
      price = parsePrice(priceDisplay);
    } catch {}
  }

  return { airline, departureTime, arrivalTime, duration, stops, stopsLabel, price, priceDisplay };
}

// Attempt to parse flight data from Google's intercepted JSON responses
function tryParseFlightData(text) {
  try {
    // Google wraps JSON in ")]}'\n" anti-hijacking prefix
    const cleaned = text.startsWith(")]}'") ? text.slice(5) : text;
    const data = JSON.parse(cleaned);
    // Try to find flight arrays in the parsed JSON
    const flights = extractFlightsFromJson(data);
    return flights.length > 0 ? flights : null;
  } catch {
    return null;
  }
}

function extractFlightsFromJson(obj, depth = 0) {
  if (depth > 8 || !obj || typeof obj !== 'object') return [];
  const results = [];
  if (Array.isArray(obj)) {
    for (const item of obj) results.push(...extractFlightsFromJson(item, depth + 1));
  } else {
    // Heuristic: a flight object has price + airline-like strings
    const vals = Object.values(obj);
    const hasPrice = vals.some(v => typeof v === 'number' && v > 50 && v < 5000);
    const hasString = vals.some(v => typeof v === 'string' && v.length > 2);
    if (hasPrice && hasString) {
      // Try to extract structured data
      const price = vals.find(v => typeof v === 'number' && v > 50 && v < 5000) || null;
      const airline = vals.find(v => typeof v === 'string' && v.length > 2) || null;
      if (price && airline) {
        results.push({ airline, price, priceDisplay: `$${price}`, departureTime: null, arrivalTime: null, duration: null, stops: null, stopsLabel: null });
      }
    }
    for (const val of vals) results.push(...extractFlightsFromJson(val, depth + 1));
  }
  return results;
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
