import { Injector } from '@angular/core';
import { Firestore, collection } from 'firebase/firestore';
import { SneatUrlOperationBlocker } from '@sneat/core';
import { SpaceModuleService } from './space-module.service';

// Mock collection function
vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore');
  return {
    ...actual,
    collection: vi.fn(() => ({ id: 'mock-collection' })),
  };
});

class TestSpaceModuleService extends SpaceModuleService<{ title: string }> {
  constructor(injector: Injector, afs: Firestore) {
    super(injector, 'test-module', afs);
  }
}

class SdkFreeTestSpaceModuleService extends SpaceModuleService<{
  title: string;
}> {
  constructor(injector: Injector) {
    super(injector, 'test-module');
  }
}

describe('SpaceModuleService', () => {
  let service: TestSpaceModuleService;
  let mockFirestore: Firestore;
  let injectedFirestore: Firestore;
  let injector: Injector;

  beforeEach(() => {
    mockFirestore = {
      type: 'Firestore',
      toJSON: () => ({}),
    } as unknown as Firestore;
    injectedFirestore = {
      type: 'Firestore',
      toJSON: () => ({}),
    } as unknown as Firestore;

    vi.mocked(collection).mockReturnValue({ id: 'spaces' } as unknown);

    injector = Injector.create({
      providers: [
        { provide: Firestore, useValue: injectedFirestore },
        {
          provide: SneatUrlOperationBlocker,
          useValue: { isBlocked: vi.fn().mockReturnValue(false) },
        },
      ],
    });
    service = new TestSpaceModuleService(injector, mockFirestore);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('keeps the explicit Firestore dependency for legacy subclasses', () => {
    expect(service.afs).toBe(mockFirestore);
  });

  it('should have correct moduleID', () => {
    expect(service.moduleID).toBe('test-module');
  });

  it('should have correct collectionName', () => {
    expect(service.collectionName).toBe('ext');
  });

  it('resolves Firestore internally for SDK-free subclasses', () => {
    const sdkFreeService = new SdkFreeTestSpaceModuleService(injector);

    expect(sdkFreeService.afs).toBe(injectedFirestore);
  });
});
