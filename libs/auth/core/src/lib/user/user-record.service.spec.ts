import { TestBed } from '@angular/core/testing';
import { SneatApiService } from '@sneat/api';
import { UserRecordService } from './user-record.service';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, firstValueFrom, throwError } from 'rxjs';
import {
  readReferralCodes,
  rememberReferralCode,
} from '../referral/referral-codes';
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
  describe('referral codes', () => {
    const code = `mi_${'a'.repeat(32)}`;
    beforeEach(() => localStorage.clear());

    it('sends the device referral codes and clears them after the answer', async () => {
      rememberReferralCode(code, 'x');
      sneatApiServiceMock.post.mockReturnValue(of({ id: 'u1', title: 'U' }));
      await firstValueFrom(service.initUserRecord({ email: 'a@example.com' }));
      const sent = sneatApiServiceMock.post.mock.calls[0][1];
      expect(sent.referralCodes).toEqual([
        expect.objectContaining({ code, source: 'x' }),
      ]);
      expect(JSON.stringify(sent.referralCodes)).not.toMatch(/pin/i);
      expect(readReferralCodes()).toEqual([]);
    });

    it('clears the codes after an error answer too', async () => {
      rememberReferralCode(code, 'x');
      sneatApiServiceMock.post.mockReturnValue(
        throwError(() => new Error('400')),
      );
      await expect(firstValueFrom(service.initUserRecord({}))).rejects.toThrow(
        '400',
      );
      expect(readReferralCodes()).toEqual([]);
    });

    it('sends no referralCodes field when the device has none', async () => {
      sneatApiServiceMock.post.mockReturnValue(of({ id: 'u1', title: 'U' }));
      await firstValueFrom(service.initUserRecord({}));
      expect('referralCodes' in sneatApiServiceMock.post.mock.calls[0][1]).toBe(
        false,
      );
    });

    it('leaves the device list alone when the caller passes its own codes list', async () => {
      rememberReferralCode(code, 'x');
      sneatApiServiceMock.post.mockReturnValue(
        throwError(() => new Error('500')),
      );
      await expect(
        firstValueFrom(service.initUserRecord({ referralCodes: [] })),
      ).rejects.toThrow('500');
      expect(readReferralCodes()).toHaveLength(1);
    });
  });
});
