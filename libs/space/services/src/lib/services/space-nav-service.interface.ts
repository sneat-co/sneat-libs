import { InjectionToken } from '@angular/core';
import { Params } from '@angular/router';
import { IIdAndBrief } from '@sneat/core';
import { IRecord } from '@sneat/data';
import { ISpaceDbo } from '@sneat/dto';
import { IMemberBrief } from '@sneat/extension-contactus-contract';
import { ISpaceContext } from '@sneat/space-models';

/**
 * Neutral push/pop transition hint. Framework-agnostic replacement for
 * Ionic's `NavController.animationDirection`: an Ionic-backed
 * `ISpaceNavService` implementation uses it to pick `navigateRoot` vs
 * `navigateForward`; a plain-Angular `Router`-backed implementation ignores
 * it.
 */
export type SpaceNavDirection = 'forward' | 'back';

export interface INavigateToLoginOptions {
  readonly returnTo?: string;
  readonly queryParams?: Params;
}

export interface ISpaceNavOptions {
  readonly queryParams?: Params;
  readonly state?: Record<string, unknown>;
}

/**
 * Semantic space-navigation contract. Implementations own the actual
 * mechanism (Ionic `NavController` nav-stack, or plain Angular `Router`) so
 * that callers and route-agnostic libraries never import a component
 * library.
 *
 * Apps provide a concrete implementation via DI — e.g.
 * `provideSpaceNavIonicInternal()` from `@sneat/space-nav-ionic` for an
 * Ionic app shell, or `provideSpaceNavRouterInternal()` from
 * `@sneat/space-nav-router` for a PrimeNG / non-Ionic app.
 */
export interface ISpaceNavService {
  navigateToSpaces(direction?: SpaceNavDirection): void;

  navigateToLogin(options?: INavigateToLoginOptions): void;

  navigateToUserProfile(): void;

  navigateToSpace(
    space: ISpaceContext,
    direction?: SpaceNavDirection,
  ): Promise<boolean>;

  navigateToMember(
    space: ISpaceContext,
    memberInfo: IIdAndBrief<IMemberBrief>,
  ): void;

  navigateToAddMetric(team: IRecord<ISpaceDbo>): void;

  navigateBackToSpacePage(
    space: ISpaceContext,
    page: string,
    navOptions?: ISpaceNavOptions,
  ): Promise<boolean>;

  navigateForwardToSpacePage(
    space: ISpaceContext,
    page: string,
    navOptions?: ISpaceNavOptions,
  ): Promise<boolean>;
}

export const SPACE_NAV_SERVICE = new InjectionToken<ISpaceNavService>(
  'SpaceNavService',
);
