import { IAuthUiLabels } from './auth-ui-labels';

const ACCENTS: Record<string, string> = {
  a: 'á',
  e: 'é',
  i: 'í',
  o: 'ö',
  u: 'ü',
  y: 'ý',
  c: 'ç',
  n: 'ñ',
  s: 'š',
  z: 'ž',
  A: 'Å',
  E: 'É',
  I: 'Î',
  O: 'Ø',
  U: 'Û',
  Y: 'Ý',
  C: 'Ç',
  N: 'Ñ',
  S: 'Š',
  Z: 'Ž',
};

/**
 * Test-only pseudo-locale: accents every letter, pads to ~40% longer (short
 * words to double) and
 * brackets the text, so a layout that clips or overflows shows it at once.
 * Use it to render screens at 320/375/1280 px in app e2e tests.
 */
export function pseudoLocalize(text: string): string {
  const accented = Array.from(text, (ch) => ACCENTS[ch] ?? ch).join('');
  // Short words grow most in translation (IBM's guideline: up to 10
  // characters can double), longer text by about 40%.
  const growth = text.length <= 10 ? text.length : Math.ceil(text.length * 0.4);
  const pad = '~'.repeat(Math.max(1, growth - 2));
  return `[${accented}${pad}]`;
}

/**
 * A pseudo set built from English. Function labels are wrapped so their
 * arguments (names, emails) pass through untouched.
 */
export function pseudoLocalizeLabels(en: IAuthUiLabels): IAuthUiLabels {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(en)) {
    if (k === 'lang') out[k] = v;
    else if (typeof v === 'string') out[k] = pseudoLocalize(v);
    else {
      const f = v as (...args: unknown[]) => string;
      out[k] = (...args: unknown[]) => `[${f(...args)}${'~'.repeat(8)}]`;
    }
  }
  return out as unknown as IAuthUiLabels;
}
