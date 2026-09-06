import { TestBed } from '@angular/core/testing';
import { Firestore } from 'firebase/firestore';
import { SneatApiService } from '@sneat/api';
import { SneatAuthStateService, SneatUserService } from '@sneat/auth-core';
import { ErrorLogger } from '@sneat/core';
import { firstValueFrom, of } from 'rxjs';
import { SpaceService } from './space.service';

describe('SpaceService', () => {
  let post: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    post = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        SpaceService,
        {
          provide: ErrorLogger,
          useValue: { logError: vi.fn(), logErrorHandler: () => vi.fn() },
        },
        {
          provide: Firestore,
          useValue: { type: 'Firestore', toJSON: () => ({}) },
        },
        {
          provide: SneatUserService,
          useValue: { userState: of({ record: undefined }) },
        },
        {
          provide: SneatApiService,
          useValue: { post, get: vi.fn() },
        },
        {
          provide: SneatAuthStateService,
          useValue: {
            authStatus: of('notAuthenticated'),
            authState: of({ status: 'notAuthenticated' }),
          },
        },
      ],
    });
  });

  it('should be created', () => {
    expect(TestBed.inject(SpaceService)).toBeTruthy();
  });

  it('returns a navigable context when create response contains only the id', async () => {
    post.mockReturnValue(of({ space: { id: 'housemates-1' } }));

    const result = await firstValueFrom(
      TestBed.inject(SpaceService).createSpace({
        type: 'group',
        groupKind: 'housemates',
        title: 'Our home',
      }),
    );

    expect(post).toHaveBeenCalledWith('spaces/create_space', {
      type: 'group',
      groupKind: 'housemates',
      title: 'Our home',
    });
    expect(result).toEqual({
      id: 'housemates-1',
      type: 'group',
      brief: {
        title: 'Our home',
        type: 'group',
        groupKind: 'housemates',
      },
    });
  });

  it('prefers authoritative response details over request fallbacks', async () => {
    post.mockReturnValue(
      of({
        space: {
          id: 'server-space',
          dbo: {
            title: 'Server title',
            type: 'family',
            countryID: 'IE',
            userIDs: ['u1'],
            metrics: [],
          },
        },
      }),
    );

    const result = await firstValueFrom(
      TestBed.inject(SpaceService).createSpace({
        type: 'group',
        groupKind: 'friends',
        title: 'Client title',
      }),
    );

    expect(result.type).toBe('family');
    expect(result.brief).toEqual({
      title: 'Server title',
      type: 'family',
    });
    expect(result.dbo?.title).toBe('Server title');
  });
});
