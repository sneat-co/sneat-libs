import { TestBed } from '@angular/core/testing';
import { NavController } from '@ionic/angular';
import { AnalyticsService, ErrorLogger } from '@sneat/core';
import { ISpaceContext } from '@sneat/space-models';
import { SpaceNavIonicService } from './space-nav-ionic.service';

describe('SpaceNavIonicService', () => {
  const navController = {
    navigateRoot: vi.fn().mockResolvedValue(true),
    navigateForward: vi.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    navController.navigateRoot.mockClear();
    navController.navigateForward.mockClear();
    TestBed.configureTestingModule({
      providers: [
        SpaceNavIonicService,
        { provide: NavController, useValue: navController },
        { provide: AnalyticsService, useValue: { logEvent: vi.fn() } },
        { provide: ErrorLogger, useValue: { logError: vi.fn() } },
      ],
    });
  });

  it('should be created', () => {
    const service = TestBed.inject(SpaceNavIonicService);
    expect(service).toBeTruthy();
  });

  it('navigateToSpaces() passes the direction hint through as animationDirection', () => {
    const service = TestBed.inject(SpaceNavIonicService);
    service.navigateToSpaces('back');
    expect(navController.navigateRoot).toHaveBeenCalledWith('spaces', {
      animationDirection: 'back',
    });
  });

  it('navigateToSpace() resolves via navController.navigateRoot()', async () => {
    const service = TestBed.inject(SpaceNavIonicService);
    const space = { id: 'sp1', type: 'team' } as unknown as ISpaceContext;
    const result = await service.navigateToSpace(space, 'forward');
    expect(result).toBe(true);
    expect(navController.navigateRoot).toHaveBeenCalledWith(
      'space/team/sp1',
      { state: { space }, animationDirection: 'forward' },
    );
  });

  it('navigateForwardToSpacePage() sets animationDirection to forward', async () => {
    const service = TestBed.inject(SpaceNavIonicService);
    const space = { id: 'sp1', type: 'team' } as unknown as ISpaceContext;
    await service.navigateForwardToSpacePage(space, 'add-metric');
    expect(navController.navigateForward).toHaveBeenCalledWith(
      'space/team/sp1/add-metric',
      expect.objectContaining({ animationDirection: 'forward' }),
    );
  });
});
