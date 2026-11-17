import { APP_BASE_HREF, PlatformLocation } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { SsoApiService } from './sso-api.service';
import { SsoLoginPageComponent } from './sso-login-page.component';
import { of } from 'rxjs';
import {
  ssoBrowserBindingStorageKey,
  ssoLoginReturnToStorageKey,
} from './sso.models';

describe('SsoLoginPageComponent', () => {
  let fixture: ComponentFixture<SsoLoginPageComponent>;
  let sso: { discover: ReturnType<typeof vi.fn>; startLogin: ReturnType<typeof vi.fn> };

  beforeEach(() => sessionStorage.clear());

  async function create(
    returnTo?: string,
    htmlBase = '/',
    appBase?: string,
  ): Promise<SsoLoginPageComponent> {
    sso = {
      discover: vi.fn(() => of({ configured: false, domain: '' })),
      startLogin: vi.fn(() =>
        of({ browserBinding: 'new-binding', authorizationURL: 'https://idp.invalid/auth' }),
      ),
    };
    await TestBed.configureTestingModule({
      imports: [SsoLoginPageComponent],
      providers: [
        {
          provide: PlatformLocation,
          useValue: { getBaseHrefFromDOM: () => htmlBase },
        },
        ...(appBase === undefined
          ? []
          : [{ provide: APP_BASE_HREF, useValue: appBase }]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap(returnTo ? { returnTo } : {}),
            },
          },
        },
        {
          provide: SsoApiService,
          useValue: sso,
        },
      ],
    })
      .overrideComponent(SsoLoginPageComponent, {
        set: { imports: [], schemas: [CUSTOM_ELEMENTS_SCHEMA] },
      })
      .compileComponents();
    fixture = TestBed.createComponent(SsoLoginPageComponent);
    return fixture.componentInstance;
  }

  it.each([
    {
      name: 'returns regular sign-in to the explicit checkout under the subpath',
      htmlBase: '/app/',
      returnTo: '/business/checkout?planID=datatug-business-usage-annual&spaceID=space_1',
      expected: '/app/login#/business/checkout?planID=datatug-business-usage-annual&spaceID=space_1',
    },
    {
      name: 'keeps the root login entry with a root navigation and subpath asset base',
      htmlBase: '/app/',
      appBase: '/',
      returnTo: '/checkout?plan=pro',
      expected: '/login#/checkout?plan=pro',
    },
    {
      name: 'keeps the legacy setup route without an explicit continuation',
      htmlBase: '/',
      domain: 'company.example',
      expected: '/login#/sso/setup?domain=company.example',
    },
    {
      name: 'uses subpath setup after discarding an unsafe continuation',
      htmlBase: '/app/',
      returnTo: '/checkout?access_token=fixture',
      domain: 'company.example',
      expected: '/app/login#/sso/setup?domain=company.example',
    },
    {
      name: 'keeps navigation on the page origin with an incompatible navigation base',
      htmlBase: '/',
      appBase: 'https://assets.example.test/app/',
      expected: '/login#/sso/setup',
    },
  ])('$name', async ({ htmlBase, appBase, returnTo, domain, expected }) => {
    const component = await create(returnTo, htmlBase, appBase);
    const state = component as unknown as {
      continueWithRegularLogin: () => void;
      unknownDomain: { set: (value: string) => void };
    };
    if (domain) state.unknownDomain.set(domain);
    const origin = 'https://app.example.test';
    const assign = vi.fn();
    vi.stubGlobal('location', { origin, assign });
    try {
      state.continueWithRegularLogin();

      expect(assign).toHaveBeenCalledExactlyOnceWith(`${origin}${expected}`);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('explains that regular login returns to the caller when a continuation exists', async () => {
    const component = await create(
      '/subscribe?plan=pro&period=yearly&checkout=test',
    );
    const state = component as unknown as {
      unknownDomain: { set: (domain: string) => void };
    };
    state.unknownDomain.set('company.example');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'we’ll return you to where you started',
    );
    expect(fixture.nativeElement.textContent).not.toContain(
      'continue with company setup',
    );
  });

  it('keeps company setup copy for an SSO flow with no continuation', async () => {
    const component = await create();
    const state = component as unknown as {
      unknownDomain: { set: (domain: string) => void };
    };
    state.unknownDomain.set('company.example');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'continue with company setup',
    );
  });

  it('preserves the continuation when retrying company SSO after callback failure', async () => {
    const returnTo = '/subscribe?plan=pro&period=yearly&checkout=test';
    const component = await create(returnTo);
    sso.discover.mockReturnValue(
      of({ configured: true, domain: 'company.example', fixedDomain: 'company.example' }),
    );
    vi.stubGlobal('location', {
      hostname: 'datatug.test',
      origin: 'https://datatug.test',
      href: 'https://datatug.test/sso?returnTo=...',
      assign: vi.fn(),
    });
    try {
      (component as unknown as {
        workEmail: { set: (value: string) => void };
        continue: () => Promise<void>;
      }).workEmail.set('buyer@company.example');
      await (component as unknown as { continue: () => Promise<void> }).continue();

      expect(sessionStorage.getItem(ssoBrowserBindingStorageKey)).toBe(
        'new-binding',
      );
      expect(sessionStorage.getItem(ssoLoginReturnToStorageKey)).toBe(returnTo);
      expect(sso.startLogin).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
