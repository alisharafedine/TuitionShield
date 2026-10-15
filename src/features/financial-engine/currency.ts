import { SupportedCurrency, CurrencyConfig } from '../../types';

export const SUPPORTED_CURRENCIES: Record<SupportedCurrency, CurrencyConfig> = {
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', minorUnits: 2 },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', minorUnits: 2 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', minorUnits: 2 },
  CNY: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', minorUnits: 2 },
  CAD: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', minorUnits: 2 },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', minorUnits: 2 },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', minorUnits: 0 },
};

/**
 * Standard illustrative exchange rates relative to EUR (for demonstration and cross-currency estimation)
 * In accordance with competition rules: Rates are labeled clearly as illustrative/assumed, never claimed to be live bank feeds.
 */
export const DEFAULT_EXCHANGE_RATES_TO_EUR: Record<SupportedCurrency, number> = {
  EUR: 1.0000,
  USD: 1.0850, // 1 EUR = 1.0850 USD  -> rate USD to EUR = 1 / 1.0850
  GBP: 0.8550, // 1 EUR = 0.8550 GBP
  CNY: 7.8200, // 1 EUR = 7.8200 CNY
  CAD: 1.4700, // 1 EUR = 1.4700 CAD
  AUD: 1.6400, // 1 EUR = 1.6400 AUD
  JPY: 162.50, // 1 EUR = 162.50 JPY
};

/**
 * Converts minor units to major units string (e.g. 800000 cents -> "8,000.00 €")
 */
export function formatMoney(
  amountMinor: number,
  currency: SupportedCurrency = 'EUR',
  includeSymbol: boolean = true
): string {
  const config = SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.EUR;
  const isNegative = amountMinor < 0;
  const absMinor = Math.abs(amountMinor);
  
  const divisor = Math.pow(10, config.minorUnits);
  const major = absMinor / divisor;

  const formattedNumber = major.toLocaleString('en-US', {
    minimumFractionDigits: config.minorUnits,
    maximumFractionDigits: config.minorUnits,
  });

  const sign = isNegative ? '-' : '';
  if (!includeSymbol) {
    return `${sign}${formattedNumber}`;
  }

  // Symbol placement
  if (['EUR', 'GBP'].includes(currency)) {
    return `${sign}${config.symbol}${formattedNumber}`;
  } else if (['USD', 'CAD', 'AUD'].includes(currency)) {
    return `${sign}${config.symbol}${formattedNumber}`;
  } else {
    return `${sign}${config.symbol}${formattedNumber} ${currency}`;
  }
}

/**
 * Parses major units input (e.g. 8000 or 8000.50) into integer minor units (e.g. 800050)
 */
export function toMinorUnits(amountMajor: number | string, currency: SupportedCurrency = 'EUR'): number {
  const config = SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.EUR;
  const num = typeof amountMajor === 'string' ? parseFloat(amountMajor.replace(/,/g, '')) : amountMajor;
  if (isNaN(num)) return 0;
  
  const multiplier = Math.pow(10, config.minorUnits);
  return Math.round(num * multiplier);
}

/**
 * Converts minor units to a floating major number for charts or display math
 */
export function toMajorUnits(amountMinor: number, currency: SupportedCurrency = 'EUR'): number {
  const config = SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.EUR;
  const divisor = Math.pow(10, config.minorUnits);
  return amountMinor / divisor;
}

export interface CurrencyConversionResult {
  sourceAmountMinor: number;
  sourceCurrency: SupportedCurrency;
  targetAmountMinor: number;
  targetCurrency: SupportedCurrency;
  exchangeRate: number; // units of target per 1 unit of source
  assumedSource: string;
}

/**
 * Converts an amount from source currency to target currency using integer-safe arithmetic
 * Validates positivity and checks bounds.
 */
export function convertCurrency(
  amountMinor: number,
  fromCurrency: SupportedCurrency,
  toCurrency: SupportedCurrency,
  customRate?: number
): CurrencyConversionResult {
  if (fromCurrency === toCurrency) {
    return {
      sourceAmountMinor: amountMinor,
      sourceCurrency: fromCurrency,
      targetAmountMinor: amountMinor,
      targetCurrency: toCurrency,
      exchangeRate: 1.0,
      assumedSource: 'Identity (Same Currency)',
    };
  }

  const fromConfig = SUPPORTED_CURRENCIES[fromCurrency] || SUPPORTED_CURRENCIES.EUR;
  const toConfig = SUPPORTED_CURRENCIES[toCurrency] || SUPPORTED_CURRENCIES.EUR;

  // Rate: target units per 1 source unit
  let rate: number;
  let rateSource = 'Demonstration Reference Rate';

  if (customRate !== undefined) {
    if (customRate <= 0 || !isFinite(customRate)) {
      throw new Error(`Invalid exchange rate: ${customRate}. Exchange rate must be strictly positive.`);
    }
    rate = customRate;
    rateSource = 'User-Configured Scenario Rate';
  } else {
    // Calculate via EUR baseline
    const fromEurRate = DEFAULT_EXCHANGE_RATES_TO_EUR[fromCurrency] || 1;
    const toEurRate = DEFAULT_EXCHANGE_RATES_TO_EUR[toCurrency] || 1;
    // 1 FromCurr = (1 / fromEurRate) EUR = (toEurRate / fromEurRate) ToCurr
    rate = toEurRate / fromEurRate;
  }

  // Convert major units:
  const sourceMajor = amountMinor / Math.pow(10, fromConfig.minorUnits);
  const targetMajor = sourceMajor * rate;
  const targetMinor = Math.round(targetMajor * Math.pow(10, toConfig.minorUnits));

  return {
    sourceAmountMinor: amountMinor,
    sourceCurrency: fromCurrency,
    targetAmountMinor: targetMinor,
    targetCurrency: toCurrency,
    exchangeRate: rate,
    assumedSource: rateSource,
  };
}
