import {
  isValidBrazilianPhone,
  isValidCpf,
  normalizeDigits,
} from './user-data';

describe('user data', () => {
  it('normalizes formatted values to digits', () => {
    expect(normalizeDigits('123.456.789-09')).toBe('12345678909');
  });

  it.each(['52998224725', '529.982.247-25'])('accepts CPF %s', (cpf) => {
    expect(isValidCpf(cpf)).toBe(true);
  });

  it.each(['11111111111', '12345678900', '123'])('rejects CPF %s', (cpf) => {
    expect(isValidCpf(cpf)).toBe(false);
  });

  it('accepts Brazilian phones with ten or eleven digits', () => {
    expect(isValidBrazilianPhone('(34) 3333-4444')).toBe(true);
    expect(isValidBrazilianPhone('(34) 99999-8888')).toBe(true);
    expect(isValidBrazilianPhone('9999')).toBe(false);
  });
});
