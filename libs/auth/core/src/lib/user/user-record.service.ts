import { Injectable, InjectionToken, inject } from '@angular/core';
import { SneatApiService } from '@sneat/api';
import { IPersonNames } from '@sneat/auth-models';
import { AgeGroupID, excludeUndefined, Gender, SpaceType } from '@sneat/core';
import { IUserDbo } from '@sneat/dto';
import { Observable, share } from 'rxjs';

/**
 * The registration app ID an app sends as `appId` on `users/init_user_record`.
 * Optional and opt-in: an app that does not provide it sends no `appId`, exactly
 * as before. The server validates it against its closed app catalog and uses it
 * to classify the registration and to pick the sign-up policy (for example
 * `askstage` creates no default Spaces). Provide only catalog IDs.
 */
export const INIT_USER_RECORD_APP_ID = new InjectionToken<string>(
  'init_user_record_app_id',
);

@Injectable({ providedIn: 'root' })
export class UserRecordService {
  private readonly sneatApiService = inject(SneatApiService);
  private readonly appId = inject(INIT_USER_RECORD_APP_ID, { optional: true });

  private initUserRecord$?: Observable<IUserDbo>;

  public initUserRecord(request: IInitUserRecordRequest): Observable<IUserDbo> {
    if (!request.ianaTimezone) {
      request = {
        ...request,
        ianaTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    }
    if (this.appId && !request.appId) {
      request = { ...request, appId: this.appId };
    }
    request = excludeUndefined(request);
    this.initUserRecord$ = this.sneatApiService
      .post<IUserDbo>('users/init_user_record', request)
      .pipe(share());
    return this.initUserRecord$;
  }
}

export interface IInitUserRecordRequest {
  /** Registration app ID from the server's closed catalog; see INIT_USER_RECORD_APP_ID. */
  readonly appId?: string;
  readonly authProvider?: string;
  readonly gender?: Gender;
  readonly ageGroup?: AgeGroupID;
  readonly names?: IPersonNames;
  readonly email?: string;
  readonly emailIsVerified?: boolean;
  readonly ianaTimezone?: string;
  readonly space?: { type: SpaceType; title: string };
}
