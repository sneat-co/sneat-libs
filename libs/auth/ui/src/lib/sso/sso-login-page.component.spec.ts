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

  async function create(returnTo?: string): Promise<SsoLoginPageComponent> {
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

  it('returns regular sign-in to an explicit checkout continuation', async () => {
    const component = await create(
      '/business/checkout?planID=datatug-business-usage-annual&spaceID=space_1',
    );
    const state = component as unknown as {
      regularLoginURL: () => string;
    };

    expect(state.regularLoginURL()).toBe(
      '/login#/business/checkout?planID=datatug-business-usage-annual&spaceID=space_1',
    );
  });

  it('keeps the legacy SSO setup route when there is no continuation', async () => {
    const component = await create();
    const state = component as unknown as {
      regularLoginURL: () => string;
      unknownDomain: { set: (domain: string) => void };
    };
    state.unknownDomain.set('company.example');

    expect(state.regularLoginURL()).toBe(
      '/login#/sso/setup?domain=company.example',
    );
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
