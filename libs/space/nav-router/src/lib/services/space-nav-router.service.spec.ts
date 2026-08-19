import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AnalyticsService, ErrorLogger } from '@sneat/core';
import { ISpaceContext } from '@sneat/space-models';
import { SpaceNavRouterService } from './space-nav-router.service';

describe('SpaceNavRouterService', () => {
  const router = {
    navigate: vi.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    router.navigate.mockClear();
    TestBed.configureTestingModule({
      providers: [
        SpaceNavRouterService,
        { provide: Router, useValue: router },
        { provide: AnalyticsService, useValue: { logEvent: vi.fn() } },
        { provide: ErrorLogger, useValue: { logError: vi.fn() } },
      ],
    });
  });

  it('should be created', () => {
    const service = TestBed.inject(SpaceNavRouterService);
    expect(service).toBeTruthy();
  });

  it('navigateToSpace() delegates to router.navigate() and ignores the direction hint', async () => {
    const service = TestBed.inject(SpaceNavRouterService);
    const space = { id: 'sp1', type: 'team' } as unknown as ISpaceContext;
    const result = await service.navigateToSpace(space, 'forward');
    expect(result).toBe(true);
    expect(router.navigate).toHaveBeenCalledWith(['space/team/sp1'], {
      state: { space },
    });
  });

  it('navigateForwardToSpacePage() builds the space page URL', async () => {
    const service = TestBed.inject(SpaceNavRouterService);
    const space = { id: 'sp1', type: 'team' } as unknown as ISpaceContext;
    await service.navigateForwardToSpacePage(space, 'add-metric');
    expect(router.navigate).toHaveBeenCalledWith(
      ['space/team/sp1/add-metric'],
      expect.objectContaining({ state: { space } }),
    );
  });
});
