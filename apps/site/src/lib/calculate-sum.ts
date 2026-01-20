export function calculateSum(
  amounts?: Array<number | null | undefined>
): number {
  if (!amounts || amounts.length === 0) return 0;
  return (amounts ?? []).reduce<number>((_sum, amount) => {
    const sum = _sum ?? 0;
    const value = Number(amount);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);
}


export function calculateTotalAmount<
  T extends { paidAmount?: number | null | undefined } | null
>(arr: T[]) {
  if (!arr || arr.length === 0) return 0;

  const amounts = arr.map(a => (a?.paidAmount ?? 0));
  return calculateSum(amounts);
}
