import { InjectionToken } from '@angular/core';
import { SpaceType } from './space-type';

// The open arm accepts niche/third-party app IDs while the literals preserve
// first-party autocomplete from the original @sneat/core contract.
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
  | 'sizeus'
  | 'splitus'
  | 'sportclubs'
  | 'template'
  | 'tournament'
  | 'trackus'
  | 'datatug'
  | 'motorius'
  | 'yachtius'
  | (string & {});
export interface IAppInfo {
  readonly appId: SneatApp;
  readonly appTitle: string;
  readonly requiredSpaceType?: SpaceType;
}
export const APP_INFO = new InjectionToken<IAppInfo>('app_info');
