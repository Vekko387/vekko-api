import { isValidBrazilianPlate, normalizePlate } from './vehicle-data';

describe('vehicle data', () => {
  it.each([
    ['abc-1234', 'ABC1234'],
    ['abc-1d23', 'ABC1D23'],
    [' ABC 1D23 ', 'ABC1D23'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizePlate(input)).toBe(expected);
  });

  it.each(['ABC1234', 'ABC1D23'])('accepts plate %s', (plate) => {
    expect(isValidBrazilianPlate(plate)).toBe(true);
  });

  it.each(['ABC123', '1234567', 'ABCD123'])('rejects plate %s', (plate) => {
    expect(isValidBrazilianPlate(plate)).toBe(false);
  });
});
