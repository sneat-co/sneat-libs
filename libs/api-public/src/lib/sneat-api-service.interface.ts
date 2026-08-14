import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface IHttpRequestOptions {
  headers?: HttpHeaders | Record<string, string | string[]>;
  observe?: 'body';
  params?: HttpParams | Record<string, string | string[]>;
  reportProgress?: boolean;
  responseType?: 'json';
  withCredentials?: boolean;
}

export interface ISneatApiResponse<T> {
  data: T;
}

export interface ISneatApiService {
  post<I, O>(
    endpoint: string,
    body: I,
    options?: IHttpRequestOptions,
  ): Observable<O>;
  put<I, O>(
    endpoint: string,
    body: I,
    options?: IHttpRequestOptions,
  ): Observable<O>;
  get<T>(
    endpoint: string,
    params?: HttpParams,
    options?: IHttpRequestOptions,
  ): Observable<T>;
  getAsAnonymous<T>(
    endpoint: string,
    params?: HttpParams,
    options?: IHttpRequestOptions,
  ): Observable<T>;
  delete<T>(endpoint: string, params?: HttpParams, body?: unknown): Observable<T>;
}
