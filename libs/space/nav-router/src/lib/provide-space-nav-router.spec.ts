import { SPACE_NAV_SERVICE } from '@sneat/space-services';
import { provideSpaceNavRouterInternal } from './provide-space-nav-router';
import { SpaceNavRouterService } from './services/space-nav-router.service';

describe('provideSpaceNavRouterInternal', () => {
  it('binds SPACE_NAV_SERVICE to SpaceNavRouterService', () => {
    const providers = provideSpaceNavRouterInternal();
    expect(providers).toContain(SpaceNavRouterService);
    expect(providers).toContainEqual({
      provide: SPACE_NAV_SERVICE,
      useExisting: SpaceNavRouterService,
    });
  });
});
