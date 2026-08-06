const NON_DIGITS_PATTERN = /\D/gu;

export function normalizeDigits(value: string): string {
  return value.replace(NON_DIGITS_PATTERN, '');
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidBrazilianPhone(value: string): boolean {
  const phone = normalizeDigits(value);
  const nationalNumber = phone.startsWith('55') ? phone.slice(2) : phone;

  return (
    /^\d{10,11}$/u.test(nationalNumber) && !/^(\d)\1+$/u.test(nationalNumber)
  );
}

export function isValidCpf(value: string): boolean {
  const cpf = normalizeDigits(value);

  if (cpf.length !== 11 || /^(\d)\1{10}$/u.test(cpf)) {
    return false;
  }

  const calculateDigit = (length: number): number => {
    let sum = 0;

    for (let index = 0; index < length; index += 1) {
      sum += Number(cpf[index]) * (length + 1 - index);
    }

    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return (
    calculateDigit(9) === Number(cpf[9]) &&
    calculateDigit(10) === Number(cpf[10])
  );
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
