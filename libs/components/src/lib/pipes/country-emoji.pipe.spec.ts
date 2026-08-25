import { TestBed } from '@angular/core/testing';
import { CountryFlagPipe, CountryTitle } from './country-emoji.pipe';
import { CountriesLoaderService } from '../country-selector';

/**
 * Zoneless replacement for the bare `tick()` these specs used to call.
 *
 * The pipes load their cache through a plain promise chain
 * (`getCountriesByID().then().catch().finally()`) with no timers involved, so
 * what `tick()` actually did here was drain the microtask queue. A real
 * `setTimeout(…, 0)` is a macrotask: every already-queued microtask — however
 * long the chain — runs to completion before it fires.
 */
const settlePromiseChain = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('Country pipes', () => {
  let countriesLoader: { getCountriesByID: () => Promise<unknown> };
  const mockCountries = {
    US: { emoji: '🇺🇸', title: 'United States' },
    UA: { emoji: '🇺🇦', title: 'Ukraine' },
  };

  beforeEach(() => {
    countriesLoader = {
      getCountriesByID: vi.fn().mockReturnValue(Promise.resolve(mockCountries)),
    };

    TestBed.configureTestingModule({
      providers: [
        CountryFlagPipe,
        CountryTitle,
        {
          provide: CountriesLoaderService,
          useValue: countriesLoader,
        },
      ],
    });
  });

  describe('CountryFlagPipe', () => {
    it('should create', () => {
      expect(TestBed.inject(CountryFlagPipe)).toBeTruthy();
    });

    it('should return empty string for empty input', () => {
      const pipe = TestBed.inject(CountryFlagPipe);
      expect(pipe.transform('')).toBe('');
      expect(pipe.transform('--')).toBe('');
    });

    it('should return countryID when cache is not yet loaded', () => {
      const pipe = TestBed.inject(CountryFlagPipe);
      expect(pipe.transform('US')).toBe('US');
    });

    it('should return emoji when cache is loaded', async () => {
      const pipe = TestBed.inject(CountryFlagPipe);
      await settlePromiseChain(); // resolve promise
      expect(pipe.transform('US')).toBe('🇺🇸');
      expect(pipe.transform('UA')).toBe('🇺🇦');
    });

    it('should return countryID for unknown country', async () => {
      const pipe = TestBed.inject(CountryFlagPipe);
      await settlePromiseChain();
      expect(pipe.transform('XX')).toBe('XX');
    });
  });

  describe('CountryTitle', () => {
    it('should create', () => {
      expect(TestBed.inject(CountryTitle)).toBeTruthy();
    });

    it('should return empty string for empty input', () => {
      const pipe = TestBed.inject(CountryTitle);
      expect(pipe.transform('')).toBe('');
    });

    it('should return countryID when cache is not yet loaded', () => {
      const pipe = TestBed.inject(CountryTitle);
      expect(pipe.transform('US')).toBe('US');
    });

    it('should return title when cache is loaded', async () => {
      const pipe = TestBed.inject(CountryTitle);
      await settlePromiseChain();
      expect(pipe.transform('US')).toBe('United States');
      expect(pipe.transform('UA')).toBe('Ukraine');
    });

    it('should return countryID for unknown country', async () => {
      const pipe = TestBed.inject(CountryTitle);
      await settlePromiseChain();
      expect(pipe.transform('XX')).toBe('XX');
    });

    it('should return empty string for undefined input', () => {
      const pipe = TestBed.inject(CountryTitle);
      expect(pipe.transform(undefined)).toBe('');
    });
  });

  describe('Error handling', () => {
    it('should handle load error gracefully', async () => {
      const errorLoader = {
        getCountriesByID: vi.fn().mockReturnValue(Promise.reject(new Error('Load failed'))),
      };

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          CountryFlagPipe,
          {
            provide: CountriesLoaderService,
            useValue: errorLoader,
          },
        ],
      });

      const pipe = TestBed.inject(CountryFlagPipe);
      await settlePromiseChain();
      // After error, should return the countryID itself
      expect(pipe.transform('US')).toBe('US');
    });
  });
});
