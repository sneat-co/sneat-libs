import { IEnvironmentConfig } from '@sneat/core';
import { appEnvironmentConfig, isLocalhost } from './init-helpers';

const PROD: IEnvironmentConfig = {
  production: true,
  agents: {},
  firebaseConfig: {
    projectId: 'sneat-eur3-1',
    appId: '1:588648831063:web:abc',
    apiKey: 'real-prod-api-key',
    authDomain: 'listus-app.web.app',
  },
  signInMethod: 'redirect',
} as IEnvironmentConfig;

function setHostname(hostname: string): void {
  vi.stubGlobal('location', { hostname });
}

describe('appEnvironmentConfig (fail-safe env selection)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns the production config verbatim on a deployed domain', () => {
    setHostname('listus-app.web.app');
    const cfg = appEnvironmentConfig(PROD);
    expect(cfg.production).toBe(true);
    expect(cfg.firebaseConfig.apiKey).toBe('real-prod-api-key');
    expect(cfg.firebaseConfig.projectId).toBe('sneat-eur3-1');
    expect(cfg.firebaseConfig.emulator).toBeUndefined();
  });

  it('also returns prod on the custom domain (no emulator leak)', () => {
    setHostname('listus.app');
    expect(appEnvironmentConfig(PROD).firebaseConfig.apiKey).toBe(
      'real-prod-api-key',
    );
  });

  it('uses the emulator only on localhost', () => {
    setHostname('localhost');
    const cfg = appEnvironmentConfig(PROD);
    expect(cfg.production).toBe(false);
    // appSpecificConfig swaps in the emulator placeholder apiKey + demo- project.
    expect(cfg.firebaseConfig.apiKey).toBe('emulator-does-not-need-api-key');
  });

  it('treats 127.0.0.1 as localhost', () => {
    setHostname('127.0.0.1');
    expect(isLocalhost()).toBe(true);
    expect(appEnvironmentConfig(PROD).production).toBe(false);
  });
});
