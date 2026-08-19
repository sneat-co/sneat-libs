import { SPACE_NAV_SERVICE } from '@sneat/space-services';
import { provideSpaceNavIonicInternal } from './provide-space-nav-ionic';
import { SpaceNavIonicService } from './services/space-nav-ionic.service';

describe('provideSpaceNavIonicInternal', () => {
  it('binds SPACE_NAV_SERVICE to SpaceNavIonicService', () => {
    const providers = provideSpaceNavIonicInternal();
    expect(providers).toContain(SpaceNavIonicService);
    expect(providers).toContainEqual({
      provide: SPACE_NAV_SERVICE,
      useExisting: SpaceNavIonicService,
    });
  });
});
