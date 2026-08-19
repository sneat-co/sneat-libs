import { SPACE_NAV_SERVICE, ISpaceNavService } from './space-nav-service.interface';

describe('SPACE_NAV_SERVICE', () => {
  it('creates a stable, uniquely-identified injection token', () => {
    expect(SPACE_NAV_SERVICE).toBeTruthy();
    expect(SPACE_NAV_SERVICE.toString()).toContain('SpaceNavService');
  });

  it('accepts an object implementing ISpaceNavService', () => {
    const impl: ISpaceNavService = {
      navigateToSpaces: () => undefined,
      navigateToLogin: () => undefined,
      navigateToUserProfile: () => undefined,
      navigateToSpace: () => Promise.resolve(true),
      navigateToMember: () => undefined,
      navigateToAddMetric: () => undefined,
      navigateBackToSpacePage: () => Promise.resolve(true),
      navigateForwardToSpacePage: () => Promise.resolve(true),
    };
    expect(impl).toBeTruthy();
  });
});
