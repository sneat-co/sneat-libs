import { Injectable, inject } from '@angular/core';
import { NavController } from '@ionic/angular';
import { AnalyticsService, ErrorLogger, IAnalyticsService, IErrorLogger, IIdAndBrief } from '@sneat/core';
import { IRecord } from '@sneat/data';
import { ISpaceDbo } from '@sneat/dto';
import { IMemberBrief } from '@sneat/extension-contactus-contract';
import { ISpaceContext } from '@sneat/space-models';
import {
  INavigateToLoginOptions,
  ISpaceNavOptions,
  ISpaceNavService,
  SpaceNavDirection,
} from '@sneat/space-services';

type NavigationOptions = NonNullable<
  Parameters<NavController['navigateRoot']>[1]
>;

/**
 * `NavController`-backed implementation of `ISpaceNavService`. Preserves the
 * exact navigation behaviour of the deprecated `SpaceNavService` — including
 * `animationDirection`-driven `navigateRoot`/`navigateForward` nav-stack
 * semantics — without leaking `NavController` into the public method
 * signatures. Register it via `provideSpaceNavIonicInternal()` at app
 * bootstrap.
 */
@Injectable()
export class SpaceNavIonicService implements ISpaceNavService {
  private readonly errorLogger = inject<IErrorLogger>(ErrorLogger);
  private readonly navController = inject(NavController);
  private readonly analyticsService =
    inject<IAnalyticsService>(AnalyticsService);

  public navigateToSpaces(direction?: SpaceNavDirection): void {
    this.analyticsService.logEvent('navigateToTeams');
    this.navController
      .navigateRoot('spaces', { animationDirection: direction })
      .catch((err) =>
        this.errorLogger.logError(err, 'Failed to navigate to teams page'),
      );
  }

  public navigateToLogin(options?: INavigateToLoginOptions): void {
    // Do not log `returnTo` as it might holds sensitive info
    this.analyticsService.logEvent('navigateToLogin');

    const navOptions: NavigationOptions = {
      queryParams: options?.queryParams,
      animationDirection: 'back',
    };
    if (options?.returnTo) {
      navOptions.fragment = options.returnTo;
    }
    this.navController
      .navigateRoot('login', navOptions)
      .catch((err) =>
        this.errorLogger.logError(err, 'Failed to navigate to login page'),
      );
  }

  public navigateToUserProfile(): void {
    this.analyticsService.logEvent('navigateToUserProfile');
    this.navController
      .navigateRoot('user-profile')
      .catch((err) =>
        this.errorLogger.logError(err, 'Failed to naviage to user profile'),
      );
  }

  public navigateToSpace(
    space: ISpaceContext,
    direction?: SpaceNavDirection,
  ): Promise<boolean> {
    this.analyticsService.logEvent('navigateToSpace', { spaceID: space.id });
    const url = `space/${space.type || space.brief?.type}/${space.id}`;
    return new Promise<boolean>((resolve, reject) => {
      this.navController
        .navigateRoot(url, {
          state: { space },
          animationDirection: direction,
        })
        .then(resolve)
        .catch((err) => {
          this.errorLogger.logError(
            err,
            'Failed to navigate to team overview page with URL: ' + url,
          );
          reject(err);
        });
    });
  }

  public navigateToMember(
    space: ISpaceContext,
    memberInfo: IIdAndBrief<IMemberBrief>,
  ): void {
    const id = `${space.id}:${memberInfo.id}`;
    this.navForward('member', {
      queryParams: { id },
      state: { space, memberInfo },
    });
  }

  public navigateToAddMetric(team: IRecord<ISpaceDbo>): void {
    const params = { space: team.id };
    this.analyticsService.logEvent('navigateToAddMetric', params);
    this.navForward('add-metric', {
      queryParams: params,
      state: { space: team },
    });
  }

  public navigateBackToSpacePage(
    space: ISpaceContext,
    page: string,
    navOptions: ISpaceNavOptions = {},
  ): Promise<boolean> {
    return this.navigateToSpacePage(space, page, {
      ...navOptions,
      animationDirection: 'back',
    });
  }

  public navigateForwardToSpacePage(
    space: ISpaceContext,
    page: string,
    navOptions: ISpaceNavOptions = {},
  ): Promise<boolean> {
    return this.navigateToSpacePage(space, page, {
      ...navOptions,
      animationDirection: 'forward',
    });
  }

  private navigateToSpacePage(
    space: ISpaceContext,
    page: string,
    navOptions: NavigationOptions,
  ): Promise<boolean> {
    const url = `space/${space?.type}/${space?.id}/${page}`;
    const state = navOptions.state || {};
    navOptions = { ...navOptions, state: { space, ...state } };
    return this.navController.navigateForward(url, navOptions);
  }

  private navForward(url: string, navOptions: NavigationOptions): void {
    this.navController
      .navigateForward(url, navOptions)
      .catch((err) =>
        this.errorLogger.logError(err, 'Failed to navigate to: ' + url),
      );
  }
}
