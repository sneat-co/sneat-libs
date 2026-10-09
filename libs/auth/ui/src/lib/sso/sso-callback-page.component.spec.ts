import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { SneatAuthStateService } from '@sneat/auth-core';
import { of } from 'rxjs';
import {
  ssoBrowserBindingStorageKey,
  ssoLoginReturnToStorageKey,
} from './sso.models';
import { SsoApiService } from './sso-api.service';
import { SsoCallbackPageComponent } from './sso-callback-page.component';

describe('SsoCallbackPageComponent', () => {
  let fixture: ComponentFixture<SsoCallbackPageComponent>;
  const navigateByUrl = vi.fn(() => Promise.resolve(true));

  beforeEach(async () => {
    sessionStorage.clear();
    navigateByUrl.mockClear();
    await TestBed.configureTestingModule({
      imports: [SsoCallbackPageComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (name: string) =>
                  name === 'code' ? 'one-time-code' : null,
              },
            },
          },
        },
        {
          provide: Router,
          useValue: { navigateByUrl },
        },
        {
          provide: SsoApiService,
          useValue: {
            exchange: vi.fn(() =>
              of({
                firebaseCustomToken: 'custom-token',
                userID: 'buyer',
                spaceID: 'space',
              }),
            ),
          },
        },
        {
          provide: SneatAuthStateService,
          useValue: {
            signInWithToken: vi.fn(async () => ({ user: { uid: 'buyer' } })),
            signOut: vi.fn(),
          },
        },
      ],
    })
      .overrideComponent(SsoCallbackPageComponent, {
        set: { imports: [], schemas: [CUSTOM_ELEMENTS_SCHEMA] },
      })
      .compileComponents();
  });

  it('returns to the saved checkout route and clears continuation state', async () => {
    sessionStorage.setItem(ssoBrowserBindingStorageKey, 'browser-binding');
    sessionStorage.setItem(
      ssoLoginReturnToStorageKey,
      '/business/checkout?planID=datatug-business-usage-annual&spaceID=space_1',
    );
    fixture = TestBed.createComponent(SsoCallbackPageComponent);
    await (
      fixture.componentInstance as unknown as {
        finishSignIn: () => Promise<void>;
      }
    ).finishSignIn();

    expect(navigateByUrl).toHaveBeenCalledWith(
      '/business/checkout?planID=datatug-business-usage-annual&spaceID=space_1',
      { replaceUrl: true },
    );
    expect(sessionStorage.getItem(ssoBrowserBindingStorageKey)).toBeNull();
    expect(sessionStorage.getItem(ssoLoginReturnToStorageKey)).toBeNull();
  });
});
