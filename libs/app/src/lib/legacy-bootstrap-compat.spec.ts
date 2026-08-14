import { TestBed } from '@angular/core/testing';
import { SNEAT_AUTHENTICATED_LIFECYCLE } from '@sneat/app-public';
import { IEnvironmentConfig, TopMenuService } from '@sneat/core';
import { BaseAppComponent } from './base-app.component';
import { getStandardSneatProviders } from './get-standard-sneat-providers';

describe('legacy app bootstrap compatibility', () => {
  it('keeps BaseAppComponent lifecycle startup idempotently delegated', () => {
    const lifecycle = { start: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        TopMenuService,
        { provide: SNEAT_AUTHENTICATED_LIFECYCLE, useValue: lifecycle },
      ],
    });
    TestBed.runInInjectionContext(() => new BaseAppComponent());
    expect(lifecycle.start).toHaveBeenCalledOnce();
  });

  it('keeps the all-in-one standard provider facade available', () => {
    const config: IEnvironmentConfig = {
      production: false,
      agents: {},
      firebaseConfig: {
        projectId: 'test',
        appId: 'test-app',
        apiKey: 'test-key',
        measurementId: 'G-PROVIDE_IF_NEEDED',
      },
    };
    expect(getStandardSneatProviders(config).length).toBeGreaterThan(5);
  });
});
