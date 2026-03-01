import NepaliDate from 'nepali-datetime';
import { describe, expect, it } from 'vitest';
import {
  calculateFiscalYear,
  compareFiscalYears,
  formatFiscalYearFromStartYear,
  getFiscalYearDateRange,
  getNextFiscalYear,
  parseFiscalYear,
} from './nepali-fiscal';

describe('nepali-fiscal', () => {
  it('formats and parses fiscal years consistently', () => {
    expect(formatFiscalYearFromStartYear(2082)).toBe('82/83');
    expect(parseFiscalYear('82/83')).toEqual({
      startBsYear: 2082,
      endBsYear: 2083,
    });
    expect(parseFiscalYear('2082/83')).toEqual({
      startBsYear: 2082,
      endBsYear: 2083,
    });
    expect(getNextFiscalYear('82/83')).toBe('83/84');
  });

  it('rolls fiscal year at Shrawan boundary in Nepali calendar', () => {
    const asarDate = new NepaliDate(2082, 2, 1).getDateObject();
    const shrawanDate = new NepaliDate(2082, 3, 1).getDateObject();

    expect(calculateFiscalYear(asarDate)).toBe('81/82');
    expect(calculateFiscalYear(shrawanDate)).toBe('82/83');
  });

  it('builds AD date range for a fiscal year from Nepali boundaries', () => {
    const range = getFiscalYearDateRange('82/83');
    expect(range).not.toBeNull();
    if (!range) return;

    const startBs = new NepaliDate(range.startDate);
    const endBs = new NepaliDate(range.endDate);
    const nextStartBs = new NepaliDate(range.nextFiscalYearStartDate);

    expect(startBs.getYear()).toBe(2082);
    expect(startBs.getMonth()).toBe(3);
    expect(startBs.getDate()).toBe(1);

    expect(endBs.getYear()).toBe(2083);
    expect(endBs.getMonth()).toBe(2);

    expect(nextStartBs.getYear()).toBe(2083);
    expect(nextStartBs.getMonth()).toBe(3);
    expect(nextStartBs.getDate()).toBe(1);
    expect(range.nextFiscalYear).toBe('83/84');
  });

  it('compares fiscal year labels numerically', () => {
    expect(compareFiscalYears('81/82', '82/83')).toBeLessThan(0);
    expect(compareFiscalYears('83/84', '82/83')).toBeGreaterThan(0);
    expect(compareFiscalYears('82/83', '82/83')).toBe(0);
  });
});
