export function formatCurrency(rs: number) {
  const safeAmount = Number.isFinite(rs) ? rs : 0;
  return new Intl.NumberFormat('ne-NP', {
    style: 'currency',
    currency: 'NPR',
    minimumFractionDigits: 2,
  }).format(safeAmount);
}
