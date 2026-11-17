import { Injectable, InjectionToken, inject } from '@angular/core';
import { SneatApiService } from '@sneat/api';
import { IPersonNames } from '@sneat/auth-models';
import { AgeGroupID, excludeUndefined, Gender, SpaceType } from '@sneat/core';
import { IUserDbo } from '@sneat/dto';
import { Observable, share, throwError } from 'rxjs';

/**
 * The registration app this app initialises users for. Optional and opt-in.
 * When provided, user init posts to the host-bound route
 * `users/<appId>/init_user_record`, so the app identity comes from the route
 * the host mounted for that app, never from the request body (the unbound
 * route ignores a body `appId`). The host-bound route picks the sign-up policy,
 * e.g. `askstage` creates no default Spaces. When absent, init posts to
 * `users/init_user_record` exactly as before.
 *
 * The value must be a lowercase catalog ID: `[a-z0-9-]` only.
 */
export const INIT_USER_RECORD_APP_ID = new InjectionToken<string>(
  'init_user_record_app_id',
);

@Injectable({ providedIn: 'root' })
export class UserRecordService {
  private readonly sneatApiService = inject(SneatApiService);
  private readonly appId = inject(INIT_USER_RECORD_APP_ID, { optional: true });

  // The app ID becomes a URL path segment, so only [a-z0-9-] is accepted.
  private static readonly validAppID = /^[a-z0-9-]+$/;

  private initUserRecord$?: Observable<IUserDbo>;

  public initUserRecord(request: IInitUserRecordRequest): Observable<IUserDbo> {
    if (!request.ianaTimezone) {
      request = {
        ...request,
        ianaTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    }
    let path = 'users/init_user_record';
    if (this.appId !== null) {
      if (
        typeof this.appId !== 'string' ||
        !UserRecordService.validAppID.test(this.appId)
      ) {
        return throwError(
          () =>
            new Error(
              `invalid INIT_USER_RECORD_APP_ID ${JSON.stringify(this.appId)}: use [a-z0-9-] only`,
            ),
        );
      }
      path = `users/${this.appId}/init_user_record`;
    }
    request = excludeUndefined(request);
    this.initUserRecord$ = this.sneatApiService
      .post<IUserDbo>(path, request)
      .pipe(share());
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
}
