export function toFiniteNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().replaceAll(',', '');

    if (!normalized) {
      return 0;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export function lineTotal(quantity: unknown, unitPrice: unknown): number {
  return toFiniteNumber(quantity) * toFiniteNumber(unitPrice);
}
