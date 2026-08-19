import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AnalyticsService, ErrorLogger, IAnalyticsService, IErrorLogger, IIdAndBrief } from '@sneat/core';
import { IRecord } from '@sneat/data';
import { ISpaceDbo } from '@sneat/dto';
import { IMemberBrief } from '@sneat/extension-contactus-contract';
import { ISpaceContext } from '@sneat/space-models';
import {
  INavigateToLoginOptions,
  ISpaceNavOptions,
  ISpaceNavService,
} from '@sneat/space-services';

/**
 * Plain Angular `Router`-backed implementation of `ISpaceNavService` for
 * non-Ionic apps (e.g. PrimeNG cockpits, Competios). The `direction`
 * push/pop hint is Ionic-only and is intentionally ignored here — `Router`
 * has no equivalent concept. Register it via
 * `provideSpaceNavRouterInternal()` at app bootstrap.
 */
@Injectable()
export class SpaceNavRouterService implements ISpaceNavService {
  private readonly router = inject(Router);
  private readonly errorLogger = inject<IErrorLogger>(ErrorLogger);
  private readonly analyticsService =
    inject<IAnalyticsService>(AnalyticsService);

  public navigateToSpaces(): void {
    this.analyticsService.logEvent('navigateToTeams');
    this.router
      .navigate(['spaces'])
      .catch((err) =>
        this.errorLogger.logError(err, 'Failed to navigate to teams page'),
      );
  }

  public navigateToLogin(options?: INavigateToLoginOptions): void {
    // Do not log `returnTo` as it might holds sensitive info
    this.analyticsService.logEvent('navigateToLogin');
    this.router
      .navigate(['login'], {
        queryParams: options?.queryParams,
        fragment: options?.returnTo,
      })
      .catch((err) =>
        this.errorLogger.logError(err, 'Failed to navigate to login page'),
      );
  }

  public navigateToUserProfile(): void {
    this.analyticsService.logEvent('navigateToUserProfile');
    this.router
      .navigate(['user-profile'])
      .catch((err) =>
        this.errorLogger.logError(err, 'Failed to naviage to user profile'),
      );
  }

  public navigateToSpace(space: ISpaceContext): Promise<boolean> {
    this.analyticsService.logEvent('navigateToSpace', { spaceID: space.id });
    const url = `space/${space.type || space.brief?.type}/${space.id}`;
    return this.router.navigate([url], { state: { space } }).catch((err) => {
      this.errorLogger.logError(
        err,
        'Failed to navigate to team overview page with URL: ' + url,
      );
      throw err;
    });
  }

  public navigateToMember(
    space: ISpaceContext,
    memberInfo: IIdAndBrief<IMemberBrief>,
  ): void {
    const id = `${space.id}:${memberInfo.id}`;
    this.navigate('member', {
      queryParams: { id },
      state: { space, memberInfo },
    });
  }

  public navigateToAddMetric(team: IRecord<ISpaceDbo>): void {
    const params = { space: team.id };
    this.analyticsService.logEvent('navigateToAddMetric', params);
    this.navigate('add-metric', {
      queryParams: params,
      state: { space: team },
    });
  }

  public navigateBackToSpacePage(
    space: ISpaceContext,
    page: string,
    navOptions: ISpaceNavOptions = {},
  ): Promise<boolean> {
    return this.navigateToSpacePage(space, page, navOptions);
  }

  public navigateForwardToSpacePage(
    space: ISpaceContext,
    page: string,
    navOptions: ISpaceNavOptions = {},
  ): Promise<boolean> {
    return this.navigateToSpacePage(space, page, navOptions);
  }

  private navigateToSpacePage(
    space: ISpaceContext,
    page: string,
    navOptions: ISpaceNavOptions,
  ): Promise<boolean> {
    const url = `space/${space?.type}/${space?.id}/${page}`;
    const state = navOptions.state || {};
    return this.router.navigate([url], {
      ...navOptions,
      state: { space, ...state },
    });
  }

  private navigate(url: string, navOptions: ISpaceNavOptions): void {
    this.router
      .navigate([url], navOptions)
      .catch((err) =>
        this.errorLogger.logError(err, 'Failed to navigate to: ' + url),
      );
  }
}
