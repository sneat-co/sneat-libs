import { HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  DefaultSneatAppApiBaseUrl,
  SneatApiBaseUrl,
  SneatApiService,
} from '@sneat/api';
import { Observable } from 'rxjs';
import {
  SsoConfig,
  SsoConfigRequest,
  SsoDomainChallengeRequest,
  SsoDiscovery,
  SsoExchange,
  SsoStart,
} from './sso.models';

@Injectable({ providedIn: 'root' })
export class SsoApiService {
  private readonly api = inject(SneatApiService);
  private readonly apiBaseURL =
    inject(SneatApiBaseUrl, { optional: true }) ?? DefaultSneatAppApiBaseUrl;

  discover(
    email: string,
    loginHost = location.hostname,
  ): Observable<SsoDiscovery> {
    return this.api.postAsAnonymous<SsoDiscovery>('sso/discover', {
      email,
      loginHost,
    });
  }

  getConfig(spaceID: string): Observable<SsoConfig> {
    return this.api.get<SsoConfig>(
      'sso/config',
      new HttpParams().set('spaceID', spaceID),
    );
  }

  saveConfig(request: SsoConfigRequest): Observable<SsoConfig> {
    return this.api.post<SsoConfig>('sso/config', request);
  }

  prepareDomain(request: SsoDomainChallengeRequest): Observable<SsoConfig> {
    return this.api.post<SsoConfig>('sso/domain/challenge', request);
  }

  verifyDomain(spaceID: string): Observable<SsoConfig> {
    return this.api.post<SsoConfig>('sso/domain/verify', { spaceID });
  }

  disable(spaceID: string): Observable<SsoConfig> {
    return this.api.post<SsoConfig>('sso/config/disable', { spaceID });
  }

  delete(spaceID: string): Observable<{ readonly deleted: boolean }> {
    return this.api.delete<{ readonly deleted: boolean }>(
      'sso/config',
      new HttpParams().set('spaceID', spaceID),
    );
  }

  samlMetadataURL(): string {
    return new URL('sso/saml/metadata', new URL(this.apiBaseURL, location.href))
      .href;
  }

  startActivation(
    spaceID: string,
    applicationBaseURL: string,
  ): Observable<SsoStart> {
    return this.api.post<SsoStart>('sso/activation/start', {
      spaceID,
      applicationBaseURL,
    });
  }

  startLogin(
    email: string,
    applicationBaseURL: string,
    loginHost = location.hostname,
  ): Observable<SsoStart> {
    return this.api.postAsAnonymous<SsoStart>('sso/login/start', {
      email,
      loginHost,
      applicationBaseURL,
    });
  }

  exchange(code: string, browserBinding: string): Observable<SsoExchange> {
    return this.api.postAsAnonymous<SsoExchange>('sso/session/exchange', {
      code,
      browserBinding,
    });
  }
}
