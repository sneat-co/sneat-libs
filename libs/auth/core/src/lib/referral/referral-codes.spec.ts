import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  captureReferralFromUrl,
  clearReferralCodes,
  isReferralCode,
  MAX_REFERRAL_CODES,
  readReferralCodes,
  REFERRAL_CODES_STORAGE_KEY,
  rememberReferralCode,
} from './referral-codes';

const code = (i: number) => `mi_${String(i).padStart(32, '0')}`;
const now = new Date('2026-11-18T09:00:00.000Z');
const later = (minutes: number) => new Date(now.getTime() + minutes * 60_000);

describe('referral codes on the device', () => {
  beforeEach(() => localStorage.clear());

  it('recognises only the referral code shape', () => {
    expect(isReferralCode(code(1))).toBe(true);
    expect(isReferralCode('mi_short')).toBe(false);
    expect(isReferralCode(42)).toBe(false);
  });

  it('keeps code, source and time, newest last', () => {
    expect(rememberReferralCode(code(1), 'x', now)).toBe(true);
    expect(rememberReferralCode(code(2), undefined, later(1))).toBe(true);
    expect(readReferralCodes(later(2))).toEqual([
      { code: code(1), source: 'x', at: now.toISOString() },
      { code: code(2), at: later(1).toISOString() },
    ]);
  });

  it('drops an invalid source but keeps the code', () => {
    rememberReferralCode(code(1), 'Not Valid!', now);
    expect(readReferralCodes(now)).toEqual([
      { code: code(1), at: now.toISOString() },
    ]);
  });

  it('moves a repeated code to the end with its new source and time', () => {
    rememberReferralCode(code(1), 'x', now);
    rememberReferralCode(code(2), 'x', later(1));
    rememberReferralCode(code(1), 'whatsapp', later(2));
    expect(readReferralCodes(later(3)).map((c) => [c.code, c.source])).toEqual([
      [code(2), 'x'],
      [code(1), 'whatsapp'],
    ]);
  });

  it(`holds at most ${MAX_REFERRAL_CODES} codes, dropping the oldest`, () => {
    for (let i = 0; i < 12; i++) rememberReferralCode(code(i), 'x', later(i));
    const list = readReferralCodes(later(20));
    expect(list).toHaveLength(MAX_REFERRAL_CODES);
    expect(list[0].code).toBe(code(2));
    expect(list[MAX_REFERRAL_CODES - 1].code).toBe(code(11));
  });

  it('forgets codes older than 30 days and ignores future-dated ones', () => {
    rememberReferralCode(code(1), 'x', now);
    expect(
      readReferralCodes(new Date(now.getTime() + 31 * 86_400_000)),
    ).toEqual([]);
    expect(readReferralCodes(new Date(now.getTime() - 60_000))).toEqual([]);
  });

  it('refuses anything that is not a referral code and writes nothing', () => {
    expect(rememberReferralCode('1234', 'x', now)).toBe(false);
    expect(localStorage.getItem(REFERRAL_CODES_STORAGE_KEY)).toBeNull();
  });

  it('ignores malformed stored data', () => {
    localStorage.setItem(REFERRAL_CODES_STORAGE_KEY, '{"not":"a list"}');
    expect(readReferralCodes(now)).toEqual([]);
    localStorage.setItem(
      REFERRAL_CODES_STORAGE_KEY,
      JSON.stringify([
        null,
        { code: 'bad', at: now.toISOString() },
        { code: code(1) },
      ]),
    );
    expect(readReferralCodes(now)).toEqual([]);
    localStorage.setItem(REFERRAL_CODES_STORAGE_KEY, 'not json');
    expect(readReferralCodes(now)).toEqual([]);
  });

  it('captures ?ref and ?src from a landing URL', () => {
    expect(
      captureReferralFromUrl(
        `https://askmic.tv/join?ref=${code(1)}&src=x`,
        now,
      ),
    ).toBe(true);
    expect(
      captureReferralFromUrl(
        new URL(`https://askmic.tv/join?ref=${code(2)}`),
        now,
      ),
    ).toBe(true);
    expect(readReferralCodes(now).map((c) => c.code)).toEqual([
      code(1),
      code(2),
    ]);
  });

  it('never stores a join invite or a PIN', () => {
    expect(
      captureReferralFromUrl(
        `/committedme/join?invite=${code(1)}&pin=4821`,
        now,
      ),
    ).toBe(false);
    expect(captureReferralFromUrl(`/join?ref=${code(1)}&pin=4821`, now)).toBe(
      false,
    );
    expect(
      captureReferralFromUrl(`/join?ref=${code(1)}&invite=${code(2)}`, now),
    ).toBe(false);
    expect(captureReferralFromUrl('/join', now)).toBe(false);
    expect(localStorage.getItem(REFERRAL_CODES_STORAGE_KEY)).toBeNull();
  });

  it.each([
    'PIN',
    'Pin',
    'pIn',
    '%50IN',
    'INVITE',
    'Invite',
    'inVite',
    '%49nvite',
    'amp;pin',
    'pin%5B%5D',
    'join.pin',
    'invite_id',
  ])(
    'refuses decoded join credential parameter %s without writing storage',
    (parameter) => {
      rememberReferralCode(code(2), 'existing', now);
      const before = localStorage.getItem(REFERRAL_CODES_STORAGE_KEY);
      const write = vi.spyOn(localStorage, 'setItem');
      try {
        expect(
          captureReferralFromUrl(`/join?ref=${code(1)}&${parameter}=4821`, now),
        ).toBe(false);
        expect(write).not.toHaveBeenCalled();
        expect(localStorage.getItem(REFERRAL_CODES_STORAGE_KEY)).toBe(before);
      } finally {
        write.mockRestore();
      }
    },
  );

  it('refuses empty or duplicate mixed-credential keys on URL objects', () => {
    const write = vi.spyOn(localStorage, 'setItem');
    try {
      for (const query of ['PIN=', 'src=x&Pin=&src=y', 'invite=&INVITE=4821']) {
        expect(
          captureReferralFromUrl(
            new URL(`https://example.test/?ref=${code(1)}&${query}`),
            now,
          ),
        ).toBe(false);
      }
      expect(write).not.toHaveBeenCalled();
      expect(localStorage.getItem(REFERRAL_CODES_STORAGE_KEY)).toBeNull();
    } finally {
      write.mockRestore();
    }
  });

  it('ignores referral links that also contain a fragment or user credentials', () => {
    const before = localStorage.getItem(REFERRAL_CODES_STORAGE_KEY);
    for (const url of [
      `/join?ref=${code(1)}#pin=4821`,
      `/join?ref=${code(1)}#/join?invite=synthetic`,
      `https://user@example.test/join?ref=${code(1)}`,
      `https://:pass@example.test/join?ref=${code(1)}`,
    ]) {
      expect(captureReferralFromUrl(url, now)).toBe(false);
    }
    expect(localStorage.getItem(REFERRAL_CODES_STORAGE_KEY)).toBe(before);
  });

  it('returns stored observation times as canonical ISO timestamps', () => {
    localStorage.setItem(
      REFERRAL_CODES_STORAGE_KEY,
      JSON.stringify([
        { code: code(1), at: now.toUTCString() + ' (annotation)' },
      ]),
    );
    expect(readReferralCodes(now)).toEqual([
      { code: code(1), at: now.toISOString() },
    ]);
  });

  it('refuses an unparseable URL', () => {
    const unparseable = {
      toString: () => {
        throw new TypeError('Invalid URL');
      },
    } as unknown as URL;
    expect(captureReferralFromUrl(unparseable, now)).toBe(false);
  });

  it('clears the list', () => {
    rememberReferralCode(code(1), 'x', now);
    clearReferralCodes();
    expect(readReferralCodes(now)).toEqual([]);
  });

  it('survives storage that throws', () => {
    const fail = (name: string) => () => {
      throw new Error(name);
    };
    const spies = [
      vi
        .spyOn(localStorage, 'setItem')
        .mockImplementation(fail('QuotaExceeded')),
      vi
        .spyOn(localStorage, 'getItem')
        .mockImplementation(fail('SecurityError')),
      vi
        .spyOn(localStorage, 'removeItem')
        .mockImplementation(fail('SecurityError')),
    ];
    try {
      expect(rememberReferralCode(code(1), 'x', now)).toBe(false);
      expect(readReferralCodes(now)).toEqual([]);
      expect(() => clearReferralCodes()).not.toThrow();
    } finally {
      spies.forEach((spy) => spy.mockRestore());
    }
  });

  it('is a no-op without localStorage', () => {
    const original = Object.getOwnPropertyDescriptor(
      globalThis,
      'localStorage',
    );
    Object.defineProperty(globalThis, 'localStorage', {
      value: undefined,
      configurable: true,
    });
    try {
      expect(rememberReferralCode(code(1), 'x', now)).toBe(false);
      expect(readReferralCodes(now)).toEqual([]);
      expect(() => clearReferralCodes()).not.toThrow();
    } finally {
      if (original) Object.defineProperty(globalThis, 'localStorage', original);
    }
  });

  it('uses the current time by default', () => {
    expect(rememberReferralCode(code(1))).toBe(true);
    expect(captureReferralFromUrl(`/join?ref=${code(2)}`)).toBe(true);
    expect(readReferralCodes()).toHaveLength(2);
  });
});
