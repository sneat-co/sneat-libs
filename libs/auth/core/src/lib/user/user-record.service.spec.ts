import { TestBed } from '@angular/core/testing';
import { SneatApiService } from '@sneat/api';
import {
  INIT_USER_RECORD_APP_ID,
  UserRecordService,
} from './user-record.service';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, firstValueFrom } from 'rxjs';
import { IUserDbo } from '@sneat/dto';

describe('UserRecordService', () => {
  let service: UserRecordService;
  let sneatApiServiceMock: { post: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    sneatApiServiceMock = {
      post: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        UserRecordService,
        {
          provide: SneatApiService,
          useValue: sneatApiServiceMock,
        },
      ],
    });
    service = TestBed.inject(UserRecordService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize user record with provided request', async () => {
    const request = {
      authProvider: 'google.com',
      email: 'test@example.com',
      emailIsVerified: true,
      names: { fullName: 'Test User' },
    };

    const mockResponse: IUserDbo = {
      id: 'user123',
      title: 'Test User',
    };

    sneatApiServiceMock.post.mockReturnValue(of(mockResponse));

    const result = await firstValueFrom(service.initUserRecord(request));

    expect(result).toEqual(mockResponse);
    expect(sneatApiServiceMock.post).toHaveBeenCalledWith(
      'users/init_user_record',
      expect.objectContaining({
        authProvider: 'google.com',
        email: 'test@example.com',
        emailIsVerified: true,
        names: { fullName: 'Test User' },
        ianaTimezone: expect.any(String),
      }),
    );
  });

  it('should add ianaTimezone if not provided', async () => {
    const request = {
      email: 'test@example.com',
    };

    const mockResponse: IUserDbo = {
      id: 'user123',
      title: 'Test User',
    };

    sneatApiServiceMock.post.mockReturnValue(of(mockResponse));

    await firstValueFrom(service.initUserRecord(request));

    const callArgs = sneatApiServiceMock.post.mock.calls[0][1];
    expect(callArgs.ianaTimezone).toBeDefined();
    expect(typeof callArgs.ianaTimezone).toBe('string');
  });

  it('should preserve provided ianaTimezone', async () => {
    const request = {
      email: 'test@example.com',
      ianaTimezone: 'America/New_York',
    };

    const mockResponse: IUserDbo = {
      id: 'user123',
      title: 'Test User',
    };

    sneatApiServiceMock.post.mockReturnValue(of(mockResponse));

    await firstValueFrom(service.initUserRecord(request));

    expect(sneatApiServiceMock.post).toHaveBeenCalledWith(
      'users/init_user_record',
      expect.objectContaining({
        ianaTimezone: 'America/New_York',
      }),
    );
  });

  it('should exclude undefined values from request', async () => {
    const request = {
      email: 'test@example.com',
      gender: undefined,
      ageGroup: undefined,
    };

    const mockResponse: IUserDbo = {
      id: 'user123',
      title: 'Test User',
    };

    sneatApiServiceMock.post.mockReturnValue(of(mockResponse));

    await firstValueFrom(service.initUserRecord(request));

    const callArgs = sneatApiServiceMock.post.mock.calls[0][1];
    expect(callArgs.gender).toBeUndefined();
    expect(callArgs.ageGroup).toBeUndefined();
    expect(callArgs.email).toBe('test@example.com');
  });

  it('should share the observable for multiple subscribers', async () => {
    const request = {
      email: 'test@example.com',
    };

    const mockResponse: IUserDbo = {
      id: 'user123',
      title: 'Test User',
    };

    sneatApiServiceMock.post.mockReturnValue(of(mockResponse));

    const obs = service.initUserRecord(request);

    await Promise.all([firstValueFrom(obs), firstValueFrom(obs)]);

    expect(sneatApiServiceMock.post).toHaveBeenCalledTimes(1);
  });

  it('posts to the unbound path with no appId when the app does not provide INIT_USER_RECORD_APP_ID', async () => {
    sneatApiServiceMock.post.mockReturnValue(of({ id: 'u1', title: 'U' }));
    await firstValueFrom(service.initUserRecord({ email: 'test@example.com' }));
    expect(sneatApiServiceMock.post.mock.calls[0][0]).toBe(
      'users/init_user_record',
    );
    expect('appId' in sneatApiServiceMock.post.mock.calls[0][1]).toBe(false);
  });
});

describe('UserRecordService with INIT_USER_RECORD_APP_ID', () => {
  let post: ReturnType<typeof vi.fn>;

  const serviceFor = (appId: unknown): UserRecordService => {
    post = vi.fn().mockReturnValue(of({ id: 'u1', title: 'U' }));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        UserRecordService,
        { provide: SneatApiService, useValue: { post } },
        { provide: INIT_USER_RECORD_APP_ID, useValue: appId },
      ],
    });
    return TestBed.inject(UserRecordService);
  };

  it.each(['askstage', 'app-2'])(
    'posts to the host-bound path users/%s/init_user_record with no appId in the body',
    async (appId) => {
      const service = serviceFor(appId);
      await firstValueFrom(service.initUserRecord({ email: 'test@example.com' }));
      expect(post).toHaveBeenCalledTimes(1);
      expect(post.mock.calls[0][0]).toBe(`users/${appId}/init_user_record`);
      expect(post.mock.calls[0][1]).toMatchObject({ email: 'test@example.com' });
      expect('appId' in post.mock.calls[0][1]).toBe(false);
    },
  );

  it('preserves the unbound path when the optional token is explicitly null', async () => {
    const service = serviceFor(null);
    await firstValueFrom(service.initUserRecord({ email: 'test@example.com' }));
    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][0]).toBe('users/init_user_record');
    expect('appId' in post.mock.calls[0][1]).toBe(false);
  });

  it.each([
    { name: 'number', value: 123 },
    { name: 'boolean', value: true },
    { name: 'undefined', value: undefined },
    { name: 'array', value: ['askstage'] },
  ])('rejects an injected $name without any request', async ({ value }) => {
    const service = serviceFor(value);
    await expect(
      firstValueFrom(service.initUserRecord({ email: 'test@example.com' })),
    ).rejects.toThrow('invalid INIT_USER_RECORD_APP_ID');
    expect(post).not.toHaveBeenCalled();
  });

  it('rejects an injected object without coercion or any request', async () => {
    const toString = vi.fn(() => 'askstage');
    const service = serviceFor({ toString });
    await expect(
      firstValueFrom(service.initUserRecord({ email: 'test@example.com' })),
    ).rejects.toThrow('invalid INIT_USER_RECORD_APP_ID');
    expect(toString).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
  });

  it('rejects a BigInt with the stable validation error and no request', async () => {
    const service = serviceFor(BigInt(123));
    await expect(
      firstValueFrom(service.initUserRecord({ email: 'test@example.com' })),
    ).rejects.toEqual(
      new Error(
        'invalid INIT_USER_RECORD_APP_ID: use a string containing [a-z0-9-] only',
      ),
    );
    expect(post).not.toHaveBeenCalled();
  });

  it('rejects a circular object with the stable validation error and no request', async () => {
    const appId: { self?: unknown } = {};
    appId.self = appId;
    const service = serviceFor(appId);
    await expect(
      firstValueFrom(service.initUserRecord({ email: 'test@example.com' })),
    ).rejects.toEqual(
      new Error(
        'invalid INIT_USER_RECORD_APP_ID: use a string containing [a-z0-9-] only',
      ),
    );
    expect(post).not.toHaveBeenCalled();
  });

  it('rejects an object without executing toJSON or making a request', async () => {
    const toJSON = vi.fn(() => 'askstage');
    const service = serviceFor({ toJSON });
    await expect(
      firstValueFrom(service.initUserRecord({ email: 'test@example.com' })),
    ).rejects.toEqual(
      new Error(
        'invalid INIT_USER_RECORD_APP_ID: use a string containing [a-z0-9-] only',
      ),
    );
    expect(toJSON).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
  });

  it('rejects an object without reading its properties or making a request', async () => {
    const getter = vi.fn(() => 'askstage');
    const appId = Object.defineProperty({}, 'value', {
      enumerable: true,
      get: getter,
    });
    const service = serviceFor(appId);
    await expect(
      firstValueFrom(service.initUserRecord({ email: 'test@example.com' })),
    ).rejects.toEqual(
      new Error(
        'invalid INIT_USER_RECORD_APP_ID: use a string containing [a-z0-9-] only',
      ),
    );
    expect(getter).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
  });

  it.each(['', 'AskStage', 'ask/stage', '../admin', 'a?b=c', 'ask stage', 'a%2f'])(
    'rejects the invalid app ID %j without any request',
    async (appId) => {
      const service = serviceFor(appId);
      await expect(
        firstValueFrom(service.initUserRecord({ email: 'test@example.com' })),
      ).rejects.toThrow('invalid INIT_USER_RECORD_APP_ID');
      expect(post).not.toHaveBeenCalled();
    },
  );
});
