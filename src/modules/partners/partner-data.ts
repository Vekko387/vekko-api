const NON_DIGITS_PATTERN = /\D/gu;

export function normalizeDigits(value: string): string {
  return value.replace(NON_DIGITS_PATTERN, '');
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function calculateCnpjDigit(base: string): number {
  let weight = base.length - 7;
  let sum = 0;

  for (const character of base) {
    sum += Number(character) * weight;
    weight -= 1;

    if (weight === 1) {
      weight = 9;
    }
  }

  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export function isValidCnpj(value: string): boolean {
  const cnpj = normalizeDigits(value);

  if (cnpj.length !== 14 || /^(\d)\1{13}$/u.test(cnpj)) {
    return false;
  }

  const firstDigit = calculateCnpjDigit(cnpj.slice(0, 12));
  const secondDigit = calculateCnpjDigit(`${cnpj.slice(0, 12)}${firstDigit}`);

  return cnpj.endsWith(`${firstDigit}${secondDigit}`);
}
