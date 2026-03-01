/**
 * Google Flights DOM selectors.
 * Google's class names are obfuscated and change periodically.
 * Update this file when Google changes its layout.
 */
export const SELECTORS = {
  // Search form
  fromInput:          'input[aria-label="Where from?"]',
  toInput:            'input[aria-label="Where to?"]',
  departureDateInput: 'input[aria-label="Departure date"]',
  searchButton:       'button[aria-label="Search"]',

  // Flight result cards
  flightCard:         'li.pIav2d',

  // Per-card fields
  airline:            'div.sSHqwe',
  airlineLogo:        'img.EbY4Pc',
  timeSpans:          'div.zxVSec span.eoY5cb',
  departureTimeAria:  'span[aria-label*="Departure time"]',
  arrivalTimeAria:    'span[aria-label*="Arrival time"]',
  duration:           'div.gvkrdb',
  stopsText:          'div.hF6lYb span.rGRiKd',
  priceText:          'div.FpEdX span',
  priceContainer:     'div.BVAVmf',
};
