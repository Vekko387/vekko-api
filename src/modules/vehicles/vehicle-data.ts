export function normalizePlate(plate: string): string {
  return plate
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/gu, '');
}

export function isValidBrazilianPlate(plate: string): boolean {
  return /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/u.test(normalizePlate(plate));
}
