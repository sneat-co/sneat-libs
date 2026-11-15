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

  it('sends no appId when the app does not provide INIT_USER_RECORD_APP_ID', async () => {
    sneatApiServiceMock.post.mockReturnValue(of({ id: 'u1', title: 'U' }));
    await firstValueFrom(service.initUserRecord({ email: 'test@example.com' }));
    const callArgs = sneatApiServiceMock.post.mock.calls[0][1];
    expect('appId' in callArgs).toBe(false);
  });
});

describe('UserRecordService with INIT_USER_RECORD_APP_ID', () => {
  let service: UserRecordService;
  let post: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    post = vi.fn().mockReturnValue(of({ id: 'u1', title: 'U' }));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        UserRecordService,
        { provide: SneatApiService, useValue: { post } },
        { provide: INIT_USER_RECORD_APP_ID, useValue: 'askstage' },
      ],
    });
    service = TestBed.inject(UserRecordService);
  });

  it('fills appId from the app config', async () => {
    await firstValueFrom(service.initUserRecord({ email: 'test@example.com' }));
    expect(post).toHaveBeenCalledWith(
      'users/init_user_record',
      expect.objectContaining({ appId: 'askstage', email: 'test@example.com' }),
    );
  });

  it('keeps an appId the caller set explicitly', async () => {
    await firstValueFrom(
      service.initUserRecord({ email: 'test@example.com', appId: 'sneat' }),
    );
    expect(post.mock.calls[0][1].appId).toBe('sneat');
  });
});
