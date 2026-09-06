import { Injector } from '@angular/core';
import { Firestore, collection } from 'firebase/firestore';
import { SneatApiService } from '@sneat/api';
import { SneatUrlOperationBlocker } from '@sneat/core';
import { firstValueFrom, of } from 'rxjs';
import {
  GlobalSpaceItemService,
  ModuleSpaceItemService,
} from './space-item.service';

// Mock collection function
vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore');
  return {
    ...actual,
    collection: vi.fn(() => ({ id: 'mock-collection' })),
  };
});

describe('GlobalSpaceItemService', () => {
  let service: GlobalSpaceItemService<unknown, unknown>;
  let mockInjector: Injector;
  let mockFirestore: Firestore;
  let mockSneatApiService: SneatApiService;

  beforeEach(() => {
    mockFirestore = {
      type: 'Firestore',
      toJSON: () => ({}),
    } as unknown as Firestore;
    mockSneatApiService = {
      post: vi.fn(),
      delete: vi.fn(),
    } as unknown as SneatApiService;
    mockInjector = Injector.create({
      providers: [
        {
          provide: SneatUrlOperationBlocker,
          useValue: { isBlocked: vi.fn().mockReturnValue(false) },
        },
      ],
    });

    service = new GlobalSpaceItemService(
      mockInjector,
      'test-collection',
      mockFirestore,
      mockSneatApiService,
    );
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should throw error if collectionName is not provided', () => {
    expect(() => {
      new GlobalSpaceItemService(
        mockInjector,
        '',
        mockFirestore,
        mockSneatApiService,
      );
    }).toThrow('collectionName is required');
  });

  it('should have correct collection name', () => {
    expect(service.collectionName).toBe('test-collection');
  });

  it('should delete space item', async () => {
    const mockResponse = { success: true };
    vi.spyOn(mockSneatApiService, 'delete').mockReturnValue(of(mockResponse));

    const request = { spaceID: 'space1' };
    const response = await firstValueFrom(
      service.deleteSpaceItem('test-endpoint', request),
    );
    expect(response).toEqual(mockResponse);
    expect(mockSneatApiService.delete).toHaveBeenCalledWith(
      'test-endpoint',
      undefined,
      request,
    );
  });

  it('should create space item', async () => {
    const mockResponse = {
      id: 'item1',
      dbo: { name: 'Test Item' },
    };
    vi.spyOn(mockSneatApiService, 'post').mockReturnValue(of(mockResponse));

    const spaceRef = { id: 'space1', type: 'team' as const };
    const request = { spaceID: 'space1', data: { name: 'Test' } };

    const item = await firstValueFrom(
      service.createSpaceItem('create-endpoint', spaceRef, request),
    );
    expect(item.id).toBe('item1');
    expect(item.space).toEqual(spaceRef);
    expect(item.dbo).toEqual(mockResponse.dbo);
  });

  it('should throw error if create response is empty', async () => {
    vi.spyOn(mockSneatApiService, 'post').mockReturnValue(of(null as unknown));

    const spaceRef = { id: 'space1', type: 'team' as const };
    const request = { spaceID: 'space1' };

    await expect(
      firstValueFrom(
        service.createSpaceItem('create-endpoint', spaceRef, request),
      ),
    ).rejects.toThrow('create team item response is empty');
  });

  it('should throw error if create response has no ID', async () => {
    const mockResponse = { dbo: { name: 'Test' } };
    vi.spyOn(mockSneatApiService, 'post').mockReturnValue(of(mockResponse));

    const spaceRef = { id: 'space1', type: 'team' as const };
    const request = { spaceID: 'space1' };

    await expect(
      firstValueFrom(
        service.createSpaceItem('create-endpoint', spaceRef, request),
      ),
    ).rejects.toThrow('create team item response have no ID');
  });
});

describe('ModuleSpaceItemService', () => {
  let service: ModuleSpaceItemService<unknown, unknown>;
  let mockInjector: Injector;
  let mockFirestore: Firestore;
  let injectedFirestore: Firestore;
  let mockSneatApiService: SneatApiService;

  beforeEach(() => {
    mockFirestore = {
      type: 'Firestore',
      toJSON: () => ({}),
    } as unknown as Firestore;
    injectedFirestore = {
      type: 'Firestore',
      toJSON: () => ({}),
    } as unknown as Firestore;
    mockSneatApiService = {
      post: vi.fn(),
    } as unknown as SneatApiService;
    mockInjector = Injector.create({
      providers: [
        { provide: Firestore, useValue: injectedFirestore },
        {
          provide: SneatUrlOperationBlocker,
          useValue: { isBlocked: vi.fn().mockReturnValue(false) },
        },
      ],
    });

    vi.mocked(collection).mockReturnValue({ id: 'spaces' } as unknown);

    service = new ModuleSpaceItemService(
      mockInjector,
      'test-module',
      'items',
      mockFirestore,
      mockSneatApiService,
    );
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('keeps the explicit Firestore dependency for legacy consumers', () => {
    expect(service.afs).toBe(mockFirestore);
  });

  it('resolves Firestore internally for SDK-free consumers', () => {
    const sdkFreeService = new ModuleSpaceItemService(
      mockInjector,
      'test-module',
      'items',
      mockSneatApiService,
    );

    expect(sdkFreeService.afs).toBe(injectedFirestore);
    expect(sdkFreeService.sneatApiService).toBe(mockSneatApiService);
  });

  it('should throw error if moduleID is not provided', () => {
    expect(() => {
      new ModuleSpaceItemService(
        mockInjector,
        '',
        'items',
        mockFirestore,
        mockSneatApiService,
      );
    }).toThrow('moduleID is required');
  });

  it('should have correct moduleID', () => {
    expect(service.moduleID).toBe('test-module');
  });

  it('should throw error when creating collection ref without spaceID', () => {
    expect(() => {
      // Access protected method via unknown cast for testing
      (service as unknown as { collectionRef: (spaceID: string) => unknown }).collectionRef('');
    }).toThrow('spaceID is required');
  });
});
