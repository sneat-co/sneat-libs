import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import {
  Inject,
  Injectable,
  InjectionToken,
  OnDestroy,
  Optional,
} from '@angular/core';
import { Observable, switchMap } from 'rxjs';
import { SneatApiAuthTokenBridge } from './sneat-api-auth-token.bridge';
import {
  IHttpRequestOptions,
  ISneatApiService,
} from './sneat-api-service.interface';

/** @deprecated Use SneatApiAuthTokenBridge. Retained as a source-compatible
 * token for consumers of the original @sneat/api surface. */
export const SneatApiAuthTokenProvider = new InjectionToken(
  'SneatApiAuthTokenProvider',
);
export const SneatApiBaseUrl = new InjectionToken<string>('SneatApiBaseUrl');
export const DefaultSneatAppApiBaseUrl = 'https://api.sneat.cloud/v0/';

@Injectable({ providedIn: 'root' })
export class SneatApiService implements ISneatApiService, OnDestroy {
  private readonly baseUrl: string;

  constructor(
    private readonly httpClient: HttpClient,
    private readonly authTokenBridge: SneatApiAuthTokenBridge,
    @Inject(SneatApiBaseUrl) @Optional() baseUrl: string | null,
  ) {
    this.baseUrl = baseUrl ?? DefaultSneatAppApiBaseUrl;
  }

  setApiAuthToken = (token?: string): void =>
    this.authTokenBridge.setExplicitToken(token);

  post<T>(
    endpoint: string,
    body: unknown,
    options?: IHttpRequestOptions,
  ): Observable<T> {
    return this.withAuth((headers) =>
      this.httpClient.post<T>(this.baseUrl + endpoint, body, {
        ...options,
        headers: this.withAuthorization(options?.headers, headers),
      }),
    );
  }

  put<T>(
    endpoint: string,
    body: unknown,
    options?: IHttpRequestOptions,
  ): Observable<T> {
    return this.withAuth((headers) =>
      this.httpClient.put<T>(this.baseUrl + endpoint, body, {
        ...options,
        headers: this.withAuthorization(options?.headers, headers),
      }),
    );
  }

  get<T>(
    endpoint: string,
    params?: HttpParams,
    options?: IHttpRequestOptions,
  ): Observable<T> {
    return this.withAuth((headers) =>
      this.httpClient.get<T>(this.baseUrl + endpoint, {
        ...options,
        headers: this.withAuthorization(options?.headers, headers),
        params: params ?? options?.params,
      }),
    );
  }

  getAsAnonymous<T>(
    endpoint: string,
    params?: HttpParams,
    options?: IHttpRequestOptions,
  ): Observable<T> {
    return this.httpClient.get<T>(this.baseUrl + endpoint, {
      ...options,
      params: params ?? options?.params,
    });
  }

  postAsAnonymous<T>(endpoint: string, body: unknown): Observable<T> {
    return this.httpClient.post<T>(this.baseUrl + endpoint, body);
  }

  delete<T>(
    endpoint: string,
    params?: HttpParams,
    body?: unknown,
  ): Observable<T> {
    return this.withAuth((headers) =>
      this.httpClient.delete<T>(this.baseUrl + endpoint, {
        params,
        headers,
        body,
      }),
    );
  }

  ngOnDestroy(): void {
    // The Firebase listener now belongs to the lazy auth adapter. Keep this
    // lifecycle method for source compatibility with the original API client.
  }

  private withAuth<T>(
    request: (headers: HttpHeaders) => Observable<T>,
  ): Observable<T> {
    return this.authTokenBridge.resolvedToken().pipe(
      switchMap((token) =>
        request(new HttpHeaders({ Authorization: `Bearer ${token}` })),
      ),
    );
  }

  private withAuthorization(
    configuredHeaders: IHttpRequestOptions['headers'],
    authorization: HttpHeaders,
  ): HttpHeaders {
    const result =
      configuredHeaders instanceof HttpHeaders
        ? configuredHeaders
        : new HttpHeaders(configuredHeaders);
    return result.set(
      'Authorization',
      authorization.get('Authorization') ?? '',
    );
  }
}
