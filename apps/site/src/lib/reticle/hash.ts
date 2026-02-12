export function hash(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const input = String(value);
  let result = 0;

  for (const letter of input) {
    const char = letter.charCodeAt(0);
    result = (result << 5) - result + char;
    result |= 0;
  }

  return `${result.toString(36)}:`;
}
