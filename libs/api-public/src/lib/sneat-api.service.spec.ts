import { HttpClient, HttpHeaders, HttpParams, provideHttpClient, withXhr } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SneatUrlOperationBlocker } from '@sneat/core-public';
import { firstValueFrom } from 'rxjs';
import {
  SneatApiAuthTokenBridge,
  SneatApiNotAuthenticatedError,
} from './sneat-api-auth-token.bridge';
import {
  DefaultSneatAppApiBaseUrl,
  SneatApiBaseUrl,
  SneatApiService,
} from './sneat-api.service';

describe('SneatApiService public transport', () => {
  let api: SneatApiService;
  let bridge: SneatApiAuthTokenBridge;
  let http: HttpTestingController;
  let operationBlockerMock: { isBlocked: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    operationBlockerMock = {
      isBlocked: vi.fn().mockReturnValue(false),
    };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: SneatApiBaseUrl, useValue: undefined },
        {
          provide: SneatUrlOperationBlocker,
          useValue: operationBlockerMock,
        },
      ],
    });
    api = TestBed.inject(SneatApiService);
    bridge = TestBed.inject(SneatApiAuthTokenBridge);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('fails protected calls closed when no auth adapter is registered', async () => {
    await expect(firstValueFrom(api.get('private'))).rejects.toBe(
      SneatApiNotAuthenticatedError,
    );
    http.expectNone(`${DefaultSneatAppApiBaseUrl}private`);
  });

  it('keeps protected and anonymous requests pending when server requests are blocked', () => {
    operationBlockerMock.isBlocked.mockImplementation(
      (operation) => operation === 'server-requests',
    );
    const events: string[] = [];

    api.get('private').subscribe({
      next: () => events.push('protected-next'),
      error: () => events.push('protected-error'),
      complete: () => events.push('protected-complete'),
    });
    api.getAsAnonymous('public').subscribe({
      next: () => events.push('anonymous-next'),
      error: () => events.push('anonymous-error'),
      complete: () => events.push('anonymous-complete'),
    });

    http.expectNone(`${DefaultSneatAppApiBaseUrl}private`);
    http.expectNone(`${DefaultSneatAppApiBaseUrl}public`);
    expect(events).toEqual([]);
  });

  it('defers a request while Firebase token readiness is pending', async () => {
    const auth = bridge.beginAuthentication();
    const response = firstValueFrom(api.get<{ ok: boolean }>('private'));
    http.expectNone(`${DefaultSneatAppApiBaseUrl}private`);

    auth.resolve('delayed-token');
    await Promise.resolve();
    const request = http.expectOne(`${DefaultSneatAppApiBaseUrl}private`);
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer delayed-token',
    );
    request.flush({ ok: true });
    await expect(response).resolves.toEqual({ ok: true });
  });

  it('fails pending calls closed once readiness resolves unauthenticated', async () => {
    const auth = bridge.beginAuthentication();
    const response = firstValueFrom(api.post('private', {}));
    auth.resolve();
    await expect(response).rejects.toBe(SneatApiNotAuthenticatedError);
  });

  it('preserves setApiAuthToken compatibility through the shared bridge', async () => {
    api.setApiAuthToken('explicit-token');
    const response = firstValueFrom(api.put<{ ok: boolean }>('private', {}));
    const request = http.expectOne(`${DefaultSneatAppApiBaseUrl}private`);
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer explicit-token',
    );
    request.flush({ ok: true });
    await expect(response).resolves.toEqual({ ok: true });

    api.setApiAuthToken(undefined);
    await expect(firstValueFrom(api.delete('private'))).rejects.toBe(
      SneatApiNotAuthenticatedError,
    );
  });

  it('lets a newer auth readiness session supersede a stale resolution', async () => {
    const stale = bridge.beginAuthentication();
    const current = bridge.beginAuthentication();
    const response = firstValueFrom(api.get<{ ok: boolean }>('private'));
    stale.resolve('stale-token');
    http.expectNone(`${DefaultSneatAppApiBaseUrl}private`);
    current.resolve('current-token');
    await Promise.resolve();
    const request = http.expectOne(`${DefaultSneatAppApiBaseUrl}private`);
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer current-token',
    );
    request.flush({ ok: true });
    await response;
  });

  it('rejects a token that resolves after the auth session changes', async () => {
    let resolveToken!: (token: string) => void;
    const pendingToken = new Promise<string>(
      (resolve) => (resolveToken = resolve),
    );
    bridge
      .beginAuthentication()
      .resolveWithTokenResolver(() => pendingToken);
    const response = firstValueFrom(api.get('private'));

    bridge.setExplicitToken(undefined);
    resolveToken('stale-token');

    await expect(response).rejects.toBe(SneatApiNotAuthenticatedError);
    http.expectNone(`${DefaultSneatAppApiBaseUrl}private`);
  });

  it('force-refreshes once and retries a protected request after a 401', async () => {
    const resolveToken = vi.fn((forceRefresh: boolean) =>
      Promise.resolve(forceRefresh ? 'refreshed-token' : 'expired-token'),
    );
    bridge
      .beginAuthentication()
      .resolveWithTokenResolver(resolveToken);
    const response = firstValueFrom(api.get<{ ok: boolean }>('private'));
    await Promise.resolve();

    const expiredRequest = http.expectOne(
      `${DefaultSneatAppApiBaseUrl}private`,
    );
    expect(expiredRequest.request.headers.get('Authorization')).toBe(
      'Bearer expired-token',
    );
    expiredRequest.flush('expired', {
      status: 401,
      statusText: 'Unauthorized',
    });
    await Promise.resolve();

    const retriedRequest = http.expectOne(
      `${DefaultSneatAppApiBaseUrl}private`,
    );
    expect(retriedRequest.request.headers.get('Authorization')).toBe(
      'Bearer refreshed-token',
    );
    retriedRequest.flush({ ok: true });

    await expect(response).resolves.toEqual({ ok: true });
    expect(resolveToken.mock.calls).toEqual([[false], [true]]);
  });

  it('does not automatically retry a mutation after a 401', async () => {
    const resolveToken = vi.fn((forceRefresh: boolean) =>
      Promise.resolve(forceRefresh ? 'refreshed-token' : 'expired-token'),
    );
    bridge
      .beginAuthentication()
      .resolveWithTokenResolver(resolveToken);
    const response = firstValueFrom(api.post('private', { value: 1 }));
    await Promise.resolve();

    const request = http.expectOne(`${DefaultSneatAppApiBaseUrl}private`);
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer expired-token',
    );
    request.flush('expired', {
      status: 401,
      statusText: 'Unauthorized',
    });

    await expect(response).rejects.toMatchObject({ status: 401 });
    expect(resolveToken.mock.calls).toEqual([[false]]);
  });

  it('keeps anonymous GET and POST independent of auth readiness', async () => {
    bridge.beginAuthentication();
    const getResult = firstValueFrom(
      api.getAsAnonymous<{ ok: boolean }>('public'),
    );
    const getRequest = http.expectOne(`${DefaultSneatAppApiBaseUrl}public`);
    expect(getRequest.request.headers.has('Authorization')).toBe(false);
    getRequest.flush({ ok: true });
    await getResult;

    const postResult = firstValueFrom(
      api.postAsAnonymous<{ ok: boolean }>('public', { value: 1 }),
    );
    const postRequest = http.expectOne(`${DefaultSneatAppApiBaseUrl}public`);
    expect(postRequest.request.body).toEqual({ value: 1 });
    postRequest.flush({ ok: true });
    await postResult;
  });

  it('preserves custom base URLs, params, and request options', async () => {
    const customApi = new SneatApiService(
      TestBed.inject(HttpClient),
      bridge,
      'https://custom-api.example/',
      operationBlockerMock as unknown as SneatUrlOperationBlocker,
    );
    customApi.setApiAuthToken('custom-token');
    const params = new HttpParams().set('id', '123');
    const response = firstValueFrom(
      customApi.get<{ ok: boolean }>('search', params, {
        headers: new HttpHeaders({ 'X-Client': 'compatibility-test' }),
        withCredentials: true,
      }),
    );
    const request = http.expectOne(
      (candidate) =>
        candidate.url === 'https://custom-api.example/search' &&
        candidate.params.get('id') === '123',
    );
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer custom-token',
    );
    expect(request.request.headers.get('X-Client')).toBe('compatibility-test');
    expect(request.request.withCredentials).toBe(true);
    request.flush({ ok: true });
    await expect(response).resolves.toEqual({ ok: true });
  });

  it('preserves anonymous params and DELETE bodies', async () => {
    const anonymous = firstValueFrom(
      api.getAsAnonymous<{ ok: boolean }>(
        'search',
        new HttpParams().set('q', 'test'),
      ),
    );
    const anonymousRequest = http.expectOne(
      (candidate) => candidate.params.get('q') === 'test',
    );
    anonymousRequest.flush({ ok: true });
    await anonymous;

    api.setApiAuthToken('delete-token');
    const deleted = firstValueFrom(
      api.delete<{ ok: boolean }>('spaces', undefined, { id: 'space-1' }),
    );
    const deleteRequest = http.expectOne(`${DefaultSneatAppApiBaseUrl}spaces`);
    expect(deleteRequest.request.method).toBe('DELETE');
    expect(deleteRequest.request.body).toEqual({ id: 'space-1' });
    deleteRequest.flush({ ok: true });
    await deleted;
  });

  it('retains the legacy destroy hook', () => {
    expect(api.ngOnDestroy()).toBeUndefined();
  });
});
