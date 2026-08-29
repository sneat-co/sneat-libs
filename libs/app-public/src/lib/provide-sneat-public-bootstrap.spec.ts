import { HttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SNEAT_URL_HASH } from '@sneat/core-public';
import { SneatApiService } from '@sneat/api-public';
import { firstValueFrom } from 'rxjs';
import { provideSneatPublicBootstrap } from './provide-sneat-public-bootstrap';

describe('provideSneatPublicBootstrap', () => {
  it('serves anonymous calls without an authenticated/Firebase scope', async () => {
    TestBed.configureTestingModule({
      providers: [provideSneatPublicBootstrap(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(SneatApiService);
    const http = TestBed.inject(HttpTestingController);
    const response = firstValueFrom(api.getAsAnonymous('public-health'));
    const request = http.expectOne('https://api.sneat.cloud/v0/public-health');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ ok: true });
    await expect(response).resolves.toEqual({ ok: true });
    http.verify();
  });

  it('keeps raw HttpClient requests pending when server requests are blocked', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: SNEAT_URL_HASH, useValue: '#block=server-requests' },
        provideSneatPublicBootstrap(),
        provideHttpClientTesting(),
      ],
    });
    const httpClient = TestBed.inject(HttpClient);
    const http = TestBed.inject(HttpTestingController);
    const events: string[] = [];

    httpClient.get('https://example.test/loading').subscribe({
      next: () => events.push('next'),
      error: () => events.push('error'),
      complete: () => events.push('complete'),
    });

    http.expectNone('https://example.test/loading');
    expect(events).toEqual([]);
    http.verify();
  });
});
