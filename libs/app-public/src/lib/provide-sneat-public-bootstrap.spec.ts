import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SneatApiService } from '@sneat/api-public';
import { firstValueFrom } from 'rxjs';
import { provideSneatPublicBootstrap } from './provide-sneat-public-bootstrap';

describe('provideSneatPublicBootstrap', () => {
  it('serves anonymous calls without an authenticated/Firebase scope', async () => {
    TestBed.configureTestingModule({ providers: [provideSneatPublicBootstrap(), provideHttpClientTesting()] });
    const api = TestBed.inject(SneatApiService);
    const http = TestBed.inject(HttpTestingController);
    const response = firstValueFrom(api.getAsAnonymous('public-health'));
    const request = http.expectOne('https://api.sneat.cloud/v0/public-health');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ ok: true });
    await expect(response).resolves.toEqual({ ok: true });
    http.verify();
  });
});
