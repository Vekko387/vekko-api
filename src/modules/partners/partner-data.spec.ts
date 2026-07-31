import { isValidCnpj, normalizeDigits, normalizeEmail } from './partner-data';

describe('partner data normalization', () => {
  it('normalizes identifiers controlled by the API', () => {
    expect(normalizeDigits('11.222.333/0001-81')).toBe('11222333000181');
    expect(normalizeEmail(' Parceiro@Example.COM ')).toBe(
      'parceiro@example.com',
    );
  });

  it('validates CNPJ check digits and rejects repeated values', () => {
    expect(isValidCnpj('11.222.333/0001-81')).toBe(true);
    expect(isValidCnpj('11.222.333/0001-82')).toBe(false);
    expect(isValidCnpj('00.000.000/0000-00')).toBe(false);
  });
});
