import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { SsoApiService } from './sso-api.service';
import { SsoLoginPageComponent } from './sso-login-page.component';

describe('SsoLoginPageComponent', () => {
  let fixture: ComponentFixture<SsoLoginPageComponent>;

  async function create(returnTo?: string): Promise<SsoLoginPageComponent> {
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
        { provide: SsoApiService, useValue: {} },
      ],
    })
      .overrideComponent(SsoLoginPageComponent, { set: { imports: [] } })
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
});
