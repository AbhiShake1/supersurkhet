type DeriveUnitPriceInput = {
  basePrice: number;
  productUnit?: string | null;
  selectedUnit?: string | null;
};

export function deriveUnitPrice({
  basePrice,
  productUnit,
  selectedUnit,
}: DeriveUnitPriceInput): number {
  const normalizedBasePrice = Number(basePrice);
  if (!Number.isFinite(normalizedBasePrice)) return 0;

  const [packedUnit, piecesPerUnit] = String(productUnit ?? '').split(':');
  const selected = String(selectedUnit ?? '').trim();

  // No conversion config on product means unit price remains the same.
  if (!piecesPerUnit) return normalizedBasePrice;

  const parsedPiecesPerUnit = Number(piecesPerUnit);
  if (!Number.isFinite(parsedPiecesPerUnit) || parsedPiecesPerUnit <= 0) {
    return normalizedBasePrice;
  }

  // UnitField stores packed unit as "unit:pieces" and piece as "piece".
  if (!selected || selected.includes(':') || selected === packedUnit) {
    return normalizedBasePrice;
  }

  if (selected === 'piece') {
    return normalizedBasePrice / parsedPiecesPerUnit;
  }

  return normalizedBasePrice;
}
