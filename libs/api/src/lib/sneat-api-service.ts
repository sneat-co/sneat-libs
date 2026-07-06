import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import {
  Inject,
  Injectable,
  InjectionToken,
  OnDestroy,
  Optional,
} from '@angular/core';
import { Auth, onIdTokenChanged } from '@angular/fire/auth';
import { Observable, Subject, throwError } from 'rxjs';
import { ISneatApiService } from './sneat-api-service.interface';

const userIsNotAuthenticatedNoFirebaseToken =
  'User is not authenticated yet - no Firebase ID token';

export const SneatApiAuthTokenProvider = new InjectionToken(
  'SneatApiAuthTokenProvider',
);
export const SneatApiBaseUrl = new InjectionToken('SneatApiBaseUrl');
// Ecosystem API base URL. Points at api.sneat.cloud — the dedicated API zone
// (its own Cloudflare zone, so the API's analytics/WAF/rate-limits are decoupled
// from the landings on sneat.co). It fronts the Cloud Run deployment of sneat-go
// (the deploy target that actually ships every backend change — the legacy GAE
// deploy behind api.sneat.ws served a stale binary, missing schoolus and
// everything since the requoter module). A Cloudflare Worker (sneat-api-proxy)
// rewrites Host so Cloud Run routes correctly. All apps using
// getStandardSneatProviders() inherit this, so it is the single repoint seam for
// the whole ecosystem.
export const DefaultSneatAppApiBaseUrl = 'https://api.sneat.cloud/v0/';

@Injectable({ providedIn: 'root' }) // Should it be in root? Probably it is OK.
export class SneatApiService implements ISneatApiService, OnDestroy {
  private readonly baseUrl: string;

  private readonly destroyed = new Subject<void>();
  private authToken?: string;

  constructor(
    private readonly httpClient: HttpClient,
    @Inject(SneatApiBaseUrl) @Optional() baseUrl: string | null,
    private readonly afAuth: Auth,
  ) {
    this.baseUrl = baseUrl ?? DefaultSneatAppApiBaseUrl;
    // console.log('SneatApiService.constructor()', this.baseUrl);
    onIdTokenChanged(this.afAuth, {
      next: (user) => {
        user
          ?.getIdToken()
          .then(this.setApiAuthToken)
          .catch((err) => console.error('getIdToken() error:', err));
      },
      error: (error) => {
        console.error('onIdTokenChanged() error:', error);
      },
      complete: () => void 0,
    });
  }

  ngOnDestroy() {
    this.destroyed.next();
    this.destroyed.complete();
  }

  // TODO: It's made public because we use it in Login page, might be a bad idea consider making private and rely on afAuth.idToken event
  setApiAuthToken = (token?: string) => {
    // console.log('setApiAuthToken()', token);
    this.authToken = token;
  };

  public post<T>(endpoint: string, body: unknown): Observable<T> {
    const url = this.baseUrl + endpoint;
    // console.log('post()', endpoint, url, body);
    return (
      this.errorIfNotAuthenticated() ||
      this.httpClient.post<T>(url, body, {
        headers: this.headers(),
      })
    );
  }

  public put<T>(endpoint: string, body: unknown): Observable<T> {
    return (
      this.errorIfNotAuthenticated() ||
      this.httpClient.put<T>(this.baseUrl + endpoint, body, {
        headers: this.headers(),
      })
    );
  }

  public get<T>(endpoint: string, params?: HttpParams): Observable<T> {
    return (
      this.errorIfNotAuthenticated() ||
      this.httpClient.get<T>(this.baseUrl + endpoint, {
        headers: this.headers(),
        params,
      })
    );
  }

  public getAsAnonymous<T>(
    endpoint: string,
    params?: HttpParams,
  ): Observable<T> {
    return this.httpClient.get<T>(this.baseUrl + endpoint, {
      params,
    });
  }

  public postAsAnonymous<T>(endpoint: string, body: unknown): Observable<T> {
    const url = this.baseUrl + endpoint;
    // alert('postAsAnonymous(), url=' + url);
    return this.httpClient.post<T>(url, body);
  }

  public delete<T>(
    endpoint: string,
    params?: HttpParams,
    body?: unknown,
  ): Observable<T> {
    // console.log('delete()', endpoint, params);
    const url = this.baseUrl + endpoint;
    return (
      this.errorIfNotAuthenticated() ||
      this.httpClient.delete<T>(url, {
        params,
        headers: this.headers(),
        body,
      })
    );
  }

  private errorIfNotAuthenticated(): Observable<never> | undefined {
    const result: Observable<never> | undefined =
      (!this.authToken &&
        throwError(() => userIsNotAuthenticatedNoFirebaseToken)) ||
      undefined;
    return result;
  }

  private headers(): HttpHeaders {
    let headers = new HttpHeaders();
    if (this.authToken) {
      headers = headers.append('Authorization', 'Bearer ' + this.authToken);
    }
    return headers;
  }
}
