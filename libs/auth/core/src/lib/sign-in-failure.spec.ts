import {
  REDIRECT_RESULT_EMPTY,
  clearRedirectSignInMarkerOnBackForward,
  REDIRECT_SIGN_IN_MARKER_STORAGE_KEY,
  REDIRECT_SIGN_IN_MARKER_TTL_MS,
  consumeRedirectSignInMarker,
  isSignInCancelled,
  markRedirectSignInStarted,
  signInFailureFromError,
  silentRedirectSignInFailure,
} from './sign-in-failure';

describe('sign-in failure', () => {
  beforeEach(() => sessionStorage.clear());

  describe('redirect marker', () => {
    it('is read once', () => {
      markRedirectSignInStarted('google.com', 1000);
      expect(consumeRedirectSignInMarker(2000)).toEqual({
        providerId: 'google.com',
        startedAt: 1000,
      });
      expect(consumeRedirectSignInMarker(2000)).toBeUndefined();
    });

    it('ignores a stale or invalid marker and removes it', () => {
      markRedirectSignInStarted('google.com', 0);
      expect(
        consumeRedirectSignInMarker(REDIRECT_SIGN_IN_MARKER_TTL_MS + 1),
      ).toBeUndefined();
      expect(
        sessionStorage.getItem(REDIRECT_SIGN_IN_MARKER_STORAGE_KEY),
      ).toBeNull();

      sessionStorage.setItem(REDIRECT_SIGN_IN_MARKER_STORAGE_KEY, '{not json');
      expect(consumeRedirectSignInMarker()).toBeUndefined();
      sessionStorage.setItem(REDIRECT_SIGN_IN_MARKER_STORAGE_KEY, '{"a":1}');
      expect(consumeRedirectSignInMarker()).toBeUndefined();
    });

    it('survives storage that throws', () => {
      const setItem = vi
        .spyOn(sessionStorage, 'setItem')
        .mockImplementation(() => {
          throw new Error('blocked');
        });
      const getItem = vi
        .spyOn(sessionStorage, 'getItem')
        .mockImplementation(() => {
          throw new Error('blocked');
        });
      expect(() => markRedirectSignInStarted('google.com')).not.toThrow();
      expect(consumeRedirectSignInMarker()).toBeUndefined();
      setItem.mockRestore();
      getItem.mockRestore();
    });
  });

  describe('signInFailureFromError', () => {
    it.each([
      ['auth/unauthorized-domain', "isn't allowed"],
      ['auth/operation-not-allowed', "isn't enabled"],
      ['auth/network-request-failed', 'internet connection'],
      ['auth/popup-blocked', 'Allow pop-ups'],
      ['auth/web-storage-unsupported', 'Allow cookies'],
      ['auth/internal-error', 'contact support'],
    ])('maps %s to an actionable hint', (code, hint) => {
      const f = signInFailureFromError(
        { code, message: `Firebase: Error (${code}).` },
        'google.com',
        'intouchkeeper.app',
      );
      expect(f.summary).toBe("Sign-in with Google didn't complete");
      expect(f.code).toBe(code);
      expect(f.message).toBe(`Firebase: Error (${code}).`);
      expect(f.host).toBe('intouchkeeper.app');
      expect(f.hints.length).toBeGreaterThan(0);
      expect(f.hints.length).toBeLessThanOrEqual(3);
      expect(f.hints.join(' ')).toContain(hint);
    });

    it('names the host in an unauthorized-domain hint', () => {
      const f = signInFailureFromError(
        { code: 'auth/unauthorized-domain' },
        undefined,
        'intouchkeeper.app',
      );
      expect(f.hints[0]).toContain('intouchkeeper.app');
    });

    it('takes the provider from the error, and handles odd errors', () => {
      expect(
        signInFailureFromError(
          { customData: { _tokenResponse: { providerId: 'github.com' } } },
          undefined,
          'h',
        ).summary,
      ).toBe("Sign-in with GitHub didn't complete");
      const f = signInFailureFromError('plain string', undefined, 'h');
      expect(f.summary).toBe("Sign-in didn't complete");
      expect(f.code).toBeUndefined();
      expect(f.message).toBe('plain string');
      expect(signInFailureFromError(undefined).message).toBeUndefined();
    });
  });

  describe('back/forward cache restore', () => {
    const pageshow = (persisted: boolean) => {
      const event = new Event('pageshow') as Event & { persisted: boolean };
      Object.defineProperty(event, 'persisted', { value: persisted });
      return event;
    };

    it('drops the marker when the page is restored from bfcache', () => {
      const stop = clearRedirectSignInMarkerOnBackForward(window);
      markRedirectSignInStarted('google.com');
      window.dispatchEvent(pageshow(false));
      expect(
        sessionStorage.getItem(REDIRECT_SIGN_IN_MARKER_STORAGE_KEY),
      ).not.toBeNull();
      window.dispatchEvent(pageshow(true));
      expect(
        sessionStorage.getItem(REDIRECT_SIGN_IN_MARKER_STORAGE_KEY),
      ).toBeNull();

      stop();
      markRedirectSignInStarted('google.com');
      window.dispatchEvent(pageshow(true));
      expect(
        sessionStorage.getItem(REDIRECT_SIGN_IN_MARKER_STORAGE_KEY),
      ).not.toBeNull();
    });

    it('is a no-op without a window', () => {
      expect(() =>
        clearRedirectSignInMarkerOnBackForward(undefined)(),
      ).not.toThrow();
    });
  });

  it('keeps the marker TTL short enough that a Back press expires it', () => {
    expect(REDIRECT_SIGN_IN_MARKER_TTL_MS).toBeLessThanOrEqual(3 * 60 * 1000);
  });

  it('explains a silent empty redirect result', () => {
    const f = silentRedirectSignInFailure('google.com', 'intouchkeeper.app');
    expect(f.code).toBe(REDIRECT_RESULT_EMPTY);
    expect(f.hints).toHaveLength(3);
    // Neutral: the user may simply have pressed Back on the provider's page.
    expect(f.hints[0]).toMatch(
      /^If you didn't cancel it, .*third-party cookies/,
    );
    expect(f.hints.join(' ')).toContain('contact support');
  });

  it('recognises user cancellations', () => {
    expect(isSignInCancelled({ code: 'auth/popup-closed-by-user' })).toBe(true);
    expect(isSignInCancelled({ code: 'auth/cancelled-popup-request' })).toBe(
      true,
    );
    expect(isSignInCancelled({ code: 'auth/popup-blocked' })).toBe(false);
    expect(isSignInCancelled(undefined)).toBe(false);
  });
});
