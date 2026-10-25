export function eanError(value: string): string | undefined {
  if (!value) return undefined;
  if (!/^\d+$/.test(value)) return "A barcode contains only digits";
  if (![8, 12, 13, 14].includes(value.length)) return "A barcode has 8, 12, 13 or 14 digits";
  return undefined;
}
