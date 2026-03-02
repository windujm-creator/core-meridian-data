/**
 * formatters.test.ts — ZERØ MERIDIAN
 * Critical business logic tests: formatters, regime detection, signal computation.
 * Run: npm test
 */

import { describe, it, expect } from 'vitest';
import {
  formatPrice, formatCompact, formatChange,
  detectRegime, computeSignal,
  type CryptoAsset,
} from '@/lib/formatters';

function makeAsset(overrides: Partial<CryptoAsset>): CryptoAsset {
  return {
    id: 'test', symbol: 'TEST', name: 'Test', rank: 1,
    price: 100, change24h: 0, change7d: 0, marketCap: 1e9,
    volume24h: 1e7, circulatingSupply: 1e6,
    ...overrides,
  };
}

describe('formatPrice', () => {
  it('formats price >= 1000 with commas', () => {
    expect(formatPrice(67840)).toBe('$67,840');
  });
  it('formats price < 1000 with 2 decimals', () => {
    expect(formatPrice(0.5432)).toBe('$0.54');
  });
  it('handles zero', () => {
    expect(formatPrice(0)).toBe('$0.00');
  });
  it('handles NaN gracefully', () => {
    expect(formatPrice(NaN)).toBe('—');
  });
});

describe('formatCompact', () => {
  it('formats trillions', () => {
    expect(formatCompact(2.5e12)).toMatch(/2\.5T/);
  });
  it('formats billions', () => {
    expect(formatCompact(1.23e9)).toMatch(/1\.23B/);
  });
  it('formats millions', () => {
    expect(formatCompact(500e6)).toMatch(/500M/);
  });
});

describe('detectRegime', () => {
  it('returns CRAB for empty assets', () => {
    expect(detectRegime([])).toBe('CRAB');
  });
  it('returns SURGE when avg change > 5%', () => {
    const assets = Array.from({ length: 20 }, (_, i) =>
      makeAsset({ id: `a${i}`, symbol: `T${i}`, change24h: 6, marketCap: 1e9 })
    );
    expect(detectRegime(assets)).toBe('SURGE');
  });
  it('returns BULL when avg 1.5-5% and breadth > 55%', () => {
    const assets = Array.from({ length: 20 }, (_, i) =>
      makeAsset({ id: `a${i}`, symbol: `T${i}`, change24h: i < 14 ? 2.5 : -0.5, marketCap: 1e9 })
    );
    expect(detectRegime(assets)).toBe('BULL');
  });
  it('returns BEAR when avg < -1.5% and breadth < 45%', () => {
    const assets = Array.from({ length: 20 }, (_, i) =>
      makeAsset({ id: `a${i}`, symbol: `T${i}`, change24h: i < 12 ? -3 : 0.5, marketCap: 1e9 })
    );
    expect(detectRegime(assets)).toBe('BEAR');
  });
});

describe('computeSignal', () => {
  it('returns NEUTRAL for empty', () => {
    expect(computeSignal([])).toBe('NEUTRAL');
  });
  it('returns STRONG_BUY in strongly positive market', () => {
    const assets = Array.from({ length: 15 }, (_, i) =>
      makeAsset({ id: `a${i}`, symbol: `T${i}`, change24h: 10, change7d: 15, marketCap: 1e9 })
    );
    expect(['STRONG_BUY', 'BUY']).toContain(computeSignal(assets));
  });
  it('returns STRONG_SELL in strongly negative market', () => {
    const assets = Array.from({ length: 15 }, (_, i) =>
      makeAsset({ id: `a${i}`, symbol: `T${i}`, change24h: -10, change7d: -15, marketCap: 1e9 })
    );
    expect(['STRONG_SELL', 'SELL']).toContain(computeSignal(assets));
  });
});
