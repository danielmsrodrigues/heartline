import { parseDecimal } from '@/lib/number';
import { parseDateOnly, toDateOnly } from '@/lib/dates';

describe('parseDecimal', () => {
  it('aceita vírgula e ponto como separador decimal', () => {
    expect(parseDecimal('0,9')).toBe(0.9);
    expect(parseDecimal('0.9')).toBe(0.9);
    expect(parseDecimal(' 142 ')).toBe(142);
    expect(parseDecimal('5,')).toBe(5);
    expect(parseDecimal(',5')).toBe(0.5);
    expect(parseDecimal(4.2)).toBe(4.2);
  });

  it('devolve null em vez de inventar um número', () => {
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal(',')).toBeNull();
    expect(parseDecimal('abc')).toBeNull();
    expect(parseDecimal('1,2,3')).toBeNull();
    expect(parseDecimal('< 0,5')).toBeNull();
    expect(parseDecimal(null)).toBeNull();
    expect(parseDecimal(NaN)).toBeNull();
  });
});

describe('datas sem fuso', () => {
  it('lê e escreve o mesmo dia, seja qual for o fuso', () => {
    const date = parseDateOnly('2026-03-01')!;
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(2);
    expect(date.getDate()).toBe(1);
    expect(toDateOnly(date)).toBe('2026-03-01');
  });

  it('não muda o dia perto da meia-noite local', () => {
    expect(toDateOnly(new Date(2026, 5, 15, 0, 30))).toBe('2026-06-15');
    expect(toDateOnly(new Date(2026, 5, 15, 23, 30))).toBe('2026-06-15');
  });

  it('rejeita valores que não são datas', () => {
    expect(parseDateOnly(null)).toBeNull();
    expect(parseDateOnly('não é data')).toBeNull();
  });
});
