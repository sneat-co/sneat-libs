import { HttpParams } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { SneatApiService } from '@sneat/api';
import { of } from 'rxjs';
import { SsoApiService } from './sso-api.service';

describe('SsoApiService', () => {
  const api = {
    get: vi.fn(() => of({})),
    post: vi.fn(() => of({})),
    postAsAnonymous: vi.fn(() => of({})),
    delete: vi.fn(() => of({ deleted: true })),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [SsoApiService, { provide: SneatApiService, useValue: api }],
    });
  });

  it('keeps discovery and login start anonymous', () => {
    const service = TestBed.inject(SsoApiService);
    service.discover('alice@acme.test', 'acme.datatug.test').subscribe();
    service
      .startLogin(
        'alice@acme.test',
        'https://acme.datatug.test',
        'acme.datatug.test',
      )
      .subscribe();
    expect(api.postAsAnonymous).toHaveBeenNthCalledWith(1, 'sso/discover', {
      email: 'alice@acme.test',
      loginHost: 'acme.datatug.test',
    });
    expect(api.postAsAnonymous).toHaveBeenNthCalledWith(2, 'sso/login/start', {
      email: 'alice@acme.test',
      loginHost: 'acme.datatug.test',
      applicationBaseURL: 'https://acme.datatug.test',
    });
  });

  it('uses authenticated calls for configuration and activation', () => {
    const service = TestBed.inject(SsoApiService);
    service
      .saveConfig({
        spaceID: 'space1',
        protocol: 'oidc',
        providerPreset: 'generic_oidc',
        emailDomain: 'acme.test',
        issuer: 'https://idp.test',
        clientID: 'client',
        clientSecret: 'secret',
      })
      .subscribe();
    service.startActivation('space1', 'https://datatug.test').subscribe();
    expect(api.post).toHaveBeenNthCalledWith(
      1,
      'sso/config',
      expect.any(Object),
    );
    expect(api.post).toHaveBeenNthCalledWith(2, 'sso/activation/start', {
      spaceID: 'space1',
      applicationBaseURL: 'https://datatug.test',
    });
  });

  it('supports domain proof and lifecycle operations', () => {
    const service = TestBed.inject(SsoApiService);
    service
      .prepareDomain({
        spaceID: 'space1',
        emailDomain: 'acme.test',
        protocol: 'saml',
        providerPreset: 'generic_saml',
      })
      .subscribe();
    service.verifyDomain('space1').subscribe();
    service.disable('space1').subscribe();
    service.delete('space1').subscribe();

    expect(api.post).toHaveBeenNthCalledWith(1, 'sso/domain/challenge', {
      spaceID: 'space1',
      emailDomain: 'acme.test',
      protocol: 'saml',
      providerPreset: 'generic_saml',
    });
    expect(api.post).toHaveBeenNthCalledWith(2, 'sso/domain/verify', {
      spaceID: 'space1',
    });
    expect(api.post).toHaveBeenNthCalledWith(3, 'sso/config/disable', {
      spaceID: 'space1',
    });
    expect(api.delete).toHaveBeenCalledWith(
      'sso/config',
      expect.any(HttpParams),
    );
  });

  it('binds the one-time session exchange to the initiating browser', () => {
    const service = TestBed.inject(SsoApiService);
    service.exchange('one-time-code', 'browser-secret').subscribe();
    expect(api.postAsAnonymous).toHaveBeenCalledWith('sso/session/exchange', {
      code: 'one-time-code',
      browserBinding: 'browser-secret',
    });
  });
});
