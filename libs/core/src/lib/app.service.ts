import { InjectionToken } from '@angular/core';
import { SpaceType } from './team-type';

// Sneat app identifier. The type is intentionally OPEN: third-party / niche
// apps can use their own appId without being enumerated here (the `string & {}`
// arm accepts any string). The explicit first-party literals are kept only for
// editor autocomplete and documentation — `string & {}` preserves those
// suggestions while still accepting arbitrary strings (plain `| string` would
// collapse the whole union to `string` and drop the autocomplete).
export type SneatApp =
  | 'sneat'
  | 'aaproject'
  | 'agendum'
  | 'budgetus'
  | 'class'
  | 'contactus'
  | 'creche'
  | 'debtus'
  | 'docus'
  | 'dream7'
  | 'eventus'
  | 'feis'
  | 'gameboard'
  | 'logist'
  | 'listus'
  | 'neighbours'
  | 'parish'
  | 'renterra'
  | 'rsvp'
  // 'sizeus' was previously registered as 'sizechart'; the legacy literal is
  // still accepted via the open `string & {}` arm below, so the rename is
  // non-breaking for any caller that still passes 'sizechart'.
  | 'sizeus'
  | 'splitus'
  | 'sportclubs'
  | 'template'
  | 'tournament'
  | 'trackus'
  | 'datatug'
  | 'motorius'
  | 'yachtius'
  // Open arm: accept any appId (e.g. third-party apps) while keeping the
  // literal suggestions above. Do not remove — this is what makes the union
  // extensible without a platform release per new app.
  | (string & {});

export interface IAppInfo {
  readonly appId: SneatApp;
  readonly appTitle: string;
  readonly requiredSpaceType?: SpaceType;
}

export const APP_INFO = new InjectionToken<IAppInfo>('app_info');
