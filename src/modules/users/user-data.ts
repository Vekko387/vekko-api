export function normalizeDigits(value: string): string {
  return value.replace(/\D/gu, '');
}

export function isValidCpf(value: string): boolean {
  const cpf = normalizeDigits(value);

  if (cpf.length !== 11 || /^(\d)\1{10}$/u.test(cpf)) {
    return false;
  }

  const calculateDigit = (length: number): number => {
    const sum = cpf
      .slice(0, length)
      .split('')
      .reduce(
        (total, digit, index) => total + Number(digit) * (length + 1 - index),
        0,
      );
    const remainder = (sum * 10) % 11;

    return remainder === 10 ? 0 : remainder;
  };

  return (
    calculateDigit(9) === Number(cpf[9]) &&
    calculateDigit(10) === Number(cpf[10])
  );
}

export function isValidBrazilianPhone(value: string): boolean {
  const phone = normalizeDigits(value);

  return phone.length === 10 || phone.length === 11;
}
