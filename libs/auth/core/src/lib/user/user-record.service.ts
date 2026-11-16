import { Injectable, inject } from '@angular/core';
import { SneatApiService } from '@sneat/api';
import { IPersonNames } from '@sneat/auth-models';
import { AgeGroupID, excludeUndefined, Gender, SpaceType } from '@sneat/core';
import { IUserDbo } from '@sneat/dto';
import { Observable, share, tap } from 'rxjs';
import {
  clearReferralCodes,
  IReferralCode,
  readReferralCodes,
} from '../referral/referral-codes';

@Injectable({ providedIn: 'root' })
export class UserRecordService {
  private readonly sneatApiService = inject(SneatApiService);

  private initUserRecord$?: Observable<IUserDbo>;

  public initUserRecord(request: IInitUserRecordRequest): Observable<IUserDbo> {
    if (!request.ianaTimezone) {
      request = {
        ...request,
        ianaTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    }
    // The device's referral codes ride along on every init; the server credits
    // them only on the first registration in a bound app. The list is cleared
    // once the server has answered, whatever the answer.
    const referralCodes = request.referralCodes ?? readReferralCodes();
    if (referralCodes.length) {
      request = { ...request, referralCodes };
    }
    request = excludeUndefined(request);
    const sentReferralCodes = !!request.referralCodes?.length;
    this.initUserRecord$ = this.sneatApiService
      .post<IUserDbo>('users/init_user_record', request)
      .pipe(
        tap({
          next: () => sentReferralCodes && clearReferralCodes(),
          error: () => sentReferralCodes && clearReferralCodes(),
        }),
        share(),
      );
    return this.initUserRecord$;
  }
}

export interface IInitUserRecordRequest {
  readonly authProvider?: string;
  readonly gender?: Gender;
  readonly ageGroup?: AgeGroupID;
  readonly names?: IPersonNames;
  readonly email?: string;
  readonly emailIsVerified?: boolean;
  readonly ianaTimezone?: string;
  readonly space?: { type: SpaceType; title: string };
  /** Public referral codes from this device, at most 10; never a join invite or a PIN. */
  readonly referralCodes?: readonly IReferralCode[];
}
