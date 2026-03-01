import { getBrowser, createContext } from './browserManager.js';

const GOOGLE_FLIGHTS_BASE = 'https://www.google.com/travel/flights';

/**
 * Scrapes Google Flights' date-picker calendar to get cheapest price per day
 * for a given month. One scrape = all 28-31 days.
 */
export async function scrapeFareCalendar({ destination, year, month, cabin = 'economy', tripType = 'one-way' }) {
  const browser = await getBrowser();
  const context = await createContext(browser);
  const page = await context.newPage();

  try {
    await page.route('**/*.{png,jpg,gif,webp,svg,woff,woff2,ttf,eot}', route => route.abort());
    await page.route('**/analytics/**', route => route.abort());

    await page.goto(GOOGLE_FLIGHTS_BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await randomDelay(1500, 2000);

    await dismissConsentDialog(page);

    // Fill origin: Austin TX
    const fromInput = page.locator('input[aria-label="Where from?"]').first();
    await fromInput.click({ timeout: 10000 });
    await fromInput.click({ clickCount: 3 });
    await page.keyboard.type('Austin TX', { delay: 60 });
    await randomDelay(1000, 1500);
    try {
      const opt = page.locator('li[role="option"]').filter({ hasText: /Austin/i }).first();
      await opt.waitFor({ state: 'visible', timeout: 5000 });
      await opt.click();
    } catch { await page.keyboard.press('Enter'); }
    await randomDelay(600, 1000);

    // Fill destination
    let toFocused = false;
    for (const sel of ['input[aria-label="Where to?"]', 'input[placeholder*="Where to"]']) {
      try {
        const el = page.locator(sel).first();
        if (await el.isVisible({ timeout: 3000 })) { await el.click({ timeout: 5000 }); toFocused = true; break; }
      } catch {}
    }
    if (!toFocused) await page.keyboard.press('Tab');
    await page.keyboard.type(destination, { delay: 70 });
    await randomDelay(1000, 1500);
    try {
      const opt = page.locator('li[role="option"]').first();
      await opt.waitFor({ state: 'visible', timeout: 5000 });
      await opt.click();
    } catch { await page.keyboard.press('Enter'); }
    await randomDelay(600, 1000);

    // Open the departure date picker
    for (const sel of ['input[aria-label="Departure date"]', 'input[aria-label*="Departure"]']) {
      try {
        const el = page.locator(sel).first();
        if (await el.isVisible({ timeout: 3000 })) { await el.click({ timeout: 5000 }); break; }
      } catch {}
    }
    await randomDelay(800, 1200);

    // Navigate calendar to target month
    await navigateToMonth(page, year, month);

    // Scrape prices from the calendar
    const prices = await scrapeCalendarPrices(page, year, month);

    return prices;
  } finally {
    await context.close();
  }
}

async function navigateToMonth(page, targetYear, targetMonth) {
  // Try up to 12 times to reach the target month
  for (let i = 0; i < 12; i++) {
    const currentHeader = await getCalendarHeader(page);
    if (!currentHeader) break;

    const { year: curYear, month: curMonth } = currentHeader;
    if (curYear === targetYear && (curMonth === targetMonth || curMonth === targetMonth - 1)) break;

    const targetDate = new Date(targetYear, targetMonth - 1, 1);
    const currentDate = new Date(curYear, curMonth - 1, 1);

    if (targetDate > currentDate) {
      // Click next month button
      try {
        const nextBtn = page.locator('button[aria-label="Next month"], button[aria-label*="next"]').first();
        if (await nextBtn.isVisible({ timeout: 2000 })) { await nextBtn.click(); await randomDelay(400, 600); continue; }
      } catch {}
    }
    break;
  }
}

async function getCalendarHeader(page) {
  try {
    // Calendar typically shows month headers like "March 2026"
    const headers = await page.locator('h2[aria-live], div[role="heading"], div.GQ4o9').allInnerTexts();
    for (const text of headers) {
      const match = text.match(/(\w+)\s+(\d{4})/);
      if (match) {
        const monthNum = new Date(`${match[1]} 1, 2000`).getMonth() + 1;
        return { year: parseInt(match[2]), month: monthNum };
      }
    }
  } catch {}
  return null;
}

async function scrapeCalendarPrices(page, year, month) {
  await randomDelay(500, 800);

  const results = [];

  // Calendar days have aria-labels like "Saturday, March 15, 2026" and contain price text
  const dayCells = await page.locator('[role="button"][aria-label]').all();

  for (const cell of dayCells) {
    try {
      const ariaLabel = await cell.getAttribute('aria-label');
      if (!ariaLabel) continue;

      // Match "Saturday, March 15, 2026" or "March 15, 2026"
      const dateMatch = ariaLabel.match(/(\w+)\s+(\d{1,2}),\s+(\d{4})/);
      if (!dateMatch) continue;

      const cellMonth = new Date(`${dateMatch[1]} 1, 2000`).getMonth() + 1;
      const cellDay = parseInt(dateMatch[2]);
      const cellYear = parseInt(dateMatch[3]);

      // Only include days from the target month/year
      if (cellYear !== year || (cellMonth !== month && cellMonth !== month + 1 && cellMonth !== month - 1)) continue;
      if (cellMonth !== month) continue;

      // Get the price text inside the cell
      const cellText = await cell.innerText().catch(() => '');
      const priceMatch = cellText.match(/\$[\d,]+/);

      const dateStr = `${cellYear}-${String(cellMonth).padStart(2, '0')}-${String(cellDay).padStart(2, '0')}`;

      if (priceMatch) {
        const price = parseInt(priceMatch[0].replace(/[$,]/g, ''));
        results.push({ date: dateStr, price, priceDisplay: priceMatch[0] });
      } else {
        // Day exists but no price shown (past date or no flights)
        results.push({ date: dateStr, price: null, priceDisplay: null });
      }
    } catch { /* skip cell */ }
  }

  // Deduplicate by date (calendar may show same date in two months)
  const seen = new Set();
  return results
    .filter(r => { if (seen.has(r.date)) return false; seen.add(r.date); return true; })
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function dismissConsentDialog(page) {
  try {
    const btn = page.locator('button:has-text("Accept all"), button:has-text("Reject all")').first();
    if (await btn.isVisible({ timeout: 3000 })) { await btn.click(); await randomDelay(500, 1000); }
  } catch {}
}

function randomDelay(min, max) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, ms));
}
