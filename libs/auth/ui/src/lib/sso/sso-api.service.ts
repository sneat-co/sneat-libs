import { HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { SneatApiService } from '@sneat/api';
import { Observable } from 'rxjs';
import {
  SsoConfig,
  SsoConfigRequest,
  SsoDiscovery,
  SsoExchange,
  SsoStart,
} from './sso.models';

@Injectable({ providedIn: 'root' })
export class SsoApiService {
  private readonly api = inject(SneatApiService);

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
