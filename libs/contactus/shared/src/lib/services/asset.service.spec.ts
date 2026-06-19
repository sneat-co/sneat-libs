import { TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import { SneatApiService } from '@sneat/api';
import { ISpaceContext } from '@sneat/space-models';
import { of } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { AssetService } from './asset.service';

vi.mock('@angular/fire/firestore', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@angular/fire/firestore')>();
  return {
    ...actual,
    collection: vi.fn().mockReturnValue({ id: 'space1' }),
  };
});

describe('AssetService (contactus-shared in-repo seam)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        AssetService,
        {
          provide: Firestore,
          useValue: { type: 'Firestore', toJSON: () => ({}) },
        },
        {
          provide: SneatApiService,
          useValue: { post: vi.fn(), get: vi.fn(), delete: vi.fn() },
        },
      ],
    });
  });

  it('should be created against the assetus module collection', () => {
    const service = TestBed.inject(AssetService);
    expect(service).toBeTruthy();
    // Constructed off ModuleSpaceItemService('assetus', 'assets') — the legacy
    // module path that the published AssetService also used.
    expect(service.moduleID).toBe('assetus');
    expect(service.collectionName).toBe('assets');
  });

  describe('watchAssetByID', () => {
    it('delegates to watchSpaceItemByIdWithSpaceRef and emits the IAssetContext', async () => {
      const service = TestBed.inject(AssetService);
      const space: ISpaceContext = { id: 'space1' };
      const emitted = { id: 'asset1', space, dbo: { name: 'My car' } };
      const watchSpy = vi
        .spyOn(service, 'watchSpaceItemByIdWithSpaceRef')
        .mockReturnValue(of(emitted) as never);

      const result = await firstValueFrom(
        service.watchAssetByID(space, 'asset1'),
      );

      expect(watchSpy).toHaveBeenCalledWith(space, 'asset1');
      expect(result).toEqual(emitted);
    });

    it('throws when the space has no id', () => {
      const service = TestBed.inject(AssetService);
      expect(() =>
        service.watchAssetByID({ id: '' } as ISpaceContext, 'asset1'),
      ).toThrow('spaceID is required');
    });
  });
});
