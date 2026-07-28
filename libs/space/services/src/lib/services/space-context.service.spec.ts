import { TestBed } from '@angular/core/testing';
import { convertToParamMap } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';

import {
  SpaceContextService,
  trackSpaceIdAndTypeFromRouteParameter,
} from './space-context.service';

describe('SpaceContextService', () => {
  let service: SpaceContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SpaceContextService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('reads group from route parameters', async () => {
    const context = await firstValueFrom(
      trackSpaceIdAndTypeFromRouteParameter(
        of(convertToParamMap({ spaceID: 'circle-1', spaceType: 'group' })),
      ),
    );

    expect(context).toEqual({ id: 'circle-1', type: 'group' });
  });

  it.each(['friends', 'private', 'unknown', undefined])(
    'does not fabricate a typed context for route type %j',
    async (spaceType) => {
      const context = await firstValueFrom(
        trackSpaceIdAndTypeFromRouteParameter(
          of(convertToParamMap({ spaceID: 'circle-1', spaceType })),
        ),
      );

      expect(context).toEqual({ id: 'circle-1', type: undefined });
    },
  );
});
