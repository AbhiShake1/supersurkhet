import NepaliDate from 'nepali-datetime';

const NEPALI_FISCAL_START_MONTH_INDEX = 3; // Shrawan
type DateLike = Date | string | number;

type ParsedFiscalYear = {
  startBsYear: number;
  endBsYear: number;
};

type FiscalYearDateRange = {
  fiscalYear: string;
  startBsYear: number;
  endBsYear: number;
  startDate: Date;
  endDate: Date;
  nextFiscalYear: string;
  nextFiscalYearStartDate: Date;
};

function isValidDate(input: unknown): input is Date {
  return input instanceof Date && Number.isFinite(input.getTime());
}

function toDate(input: DateLike | undefined) {
  if (!input) return null;
  const date = input instanceof Date ? input : new Date(input);
  if (!isValidDate(date)) return null;
  return date;
}

function normalizeTwoDigitYear(year: number) {
  return Number.isFinite(year) ? year % 100 : 0;
}

function normalizeBsYearPart(yearPart: number) {
  if (!Number.isFinite(yearPart)) return NaN;
  if (yearPart >= 1000) return yearPart;
  if (yearPart < 0) return NaN;
  return 2000 + normalizeTwoDigitYear(yearPart);
}

export function formatFiscalYearFromStartYear(startBsYear: number) {
  const start = normalizeTwoDigitYear(startBsYear);
  const end = normalizeTwoDigitYear(startBsYear + 1);
  return `${String(start).padStart(2, '0')}/${String(end).padStart(2, '0')}`;
}

export function parseFiscalYear(fiscalYear: string): ParsedFiscalYear | null {
  const [startRaw, endRaw] = fiscalYear
    .split('/')
    .map((part) => part.trim())
    .slice(0, 2);
  if (!startRaw || !endRaw) return null;

  const parsedStart = Number(startRaw);
  const parsedEnd = Number(endRaw);
  if (!Number.isFinite(parsedStart) || !Number.isFinite(parsedEnd)) return null;

  const startBsYear = normalizeBsYearPart(parsedStart);
  if (!Number.isFinite(startBsYear)) return null;

  let endBsYear = normalizeBsYearPart(parsedEnd);
  if (!Number.isFinite(endBsYear)) return null;
  if (endBsYear < startBsYear) {
    endBsYear += 100;
  }

  if (endBsYear <= startBsYear) {
    endBsYear = startBsYear + 1;
  }

  return {
    startBsYear,
    endBsYear,
  };
}

export function compareFiscalYears(a: string, b: string) {
  const parsedA = parseFiscalYear(a);
  const parsedB = parseFiscalYear(b);
  if (!parsedA || !parsedB) return a.localeCompare(b);
  if (parsedA.startBsYear !== parsedB.startBsYear) {
    return parsedA.startBsYear - parsedB.startBsYear;
  }
  if (parsedA.endBsYear !== parsedB.endBsYear) {
    return parsedA.endBsYear - parsedB.endBsYear;
  }
  return a.localeCompare(b);
}

export function sortFiscalYearsDesc(a: string, b: string) {
  return compareFiscalYears(b, a);
}

export function getNextFiscalYear(fiscalYear: string) {
  const parsed = parseFiscalYear(fiscalYear);
  if (!parsed) return fiscalYear;
  return formatFiscalYearFromStartYear(parsed.startBsYear + 1);
}

export function calculateFiscalYear(input?: DateLike) {
  const referenceDate = toDate(input);
  const nepali = referenceDate
    ? new NepaliDate(referenceDate)
    : new NepaliDate();
  const bsYear = nepali.getYear();
  const bsMonth = nepali.getMonth();
  const startBsYear =
    bsMonth >= NEPALI_FISCAL_START_MONTH_INDEX ? bsYear : bsYear - 1;
  return formatFiscalYearFromStartYear(startBsYear);
}

export function getFiscalYearDateRange(
  fiscalYear: string,
): FiscalYearDateRange | null {
  const parsed = parseFiscalYear(fiscalYear);
  if (!parsed) return null;

  const startNepali = new NepaliDate(
    parsed.startBsYear,
    NEPALI_FISCAL_START_MONTH_INDEX,
    1,
  );
  const nextStartNepali = new NepaliDate(
    parsed.endBsYear,
    NEPALI_FISCAL_START_MONTH_INDEX,
    1,
  );

  const startDate = startNepali.getDateObject();
  const nextFiscalYearStartDate = nextStartNepali.getDateObject();
  if (!isValidDate(startDate) || !isValidDate(nextFiscalYearStartDate)) {
    return null;
  }

  const endDate = new Date(nextFiscalYearStartDate.getTime() - 1);

  return {
    fiscalYear: formatFiscalYearFromStartYear(parsed.startBsYear),
    startBsYear: parsed.startBsYear,
    endBsYear: parsed.endBsYear,
    startDate,
    endDate,
    nextFiscalYear: formatFiscalYearFromStartYear(parsed.startBsYear + 1),
    nextFiscalYearStartDate,
  };
}
