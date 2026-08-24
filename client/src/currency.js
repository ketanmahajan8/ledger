// Supported currencies. Keep this list in sync with SUPPORTED_CURRENCIES
// in server/src/routes/households.js.
export const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'INR', symbol: '₹', label: 'Indian Rupee' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar' },
  { code: 'SGD', symbol: 'S$', label: 'Singapore Dollar' },
  { code: 'AED', symbol: 'د.إ', label: 'UAE Dirham' },
];

const BY_CODE = Object.fromEntries(CURRENCIES.map((c) => [c.code, c]));

export function currencySymbol(code) {
  return BY_CODE[code]?.symbol ?? code ?? '$';
}

// Yen has no minor unit in everyday use; everything else shows 2 decimals.
export function formatMoney(amount, code = 'USD') {
  const symbol = currencySymbol(code);
  const decimals = code === 'JPY' ? 0 : 2;
  const value = Number(amount ?? 0).toFixed(decimals);
  return `${symbol}${value}`;
}
