import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonItem } from '@ionic/angular/ion-item';
import { IonLabel } from '@ionic/angular/ion-label';
import { IonNote } from '@ionic/angular/ion-note';
import { BUILD_INFO, IBuildInfo } from '@sneat/core-public';
import { addIcons } from 'ionicons';
import { chevronDownOutline, chevronUpOutline } from 'ionicons/icons';
import { buildInfo as placeholderBuildInfo } from './build-info';

addIcons({ chevronDownOutline, chevronUpOutline });
// The template binds the icon `name` in kebab-case ('chevron-down-outline' /
// 'chevron-up-outline'), not the camelCase import names above: ionicons
// 8's runtime `getName()` lowercases whatever `name` it's given without
// inserting dashes (so a camelCase name arrives as e.g.
// "chevrondownoutline"), while `addIcons()` only ever registers the
// original camelCase key verbatim plus its kebab-case form — never an
// all-lowercase, no-dashes form. A camelCase `[name]` binding therefore
// never resolves (silent "[Ionicons Warning]: Could not load icon...").
// Verified empirically against
// node_modules/ionicons/dist/collection/components/icon/utils.js. Mirrors
// DataTug's local sibling of this component:
// datatug-apps' libs/datatug/main/src/lib/menu/build-info/menu-build-info.component.ts.

// Collapsible footer — a single collapsed-by-default row showing the app's
// copyright line, expandable to reveal the app version, short git hash, and
// UTC build timestamp. Founder ruling 2026-09-11: the previous
// always-expanded "App version" card (an ion-item-divider + two rows, one of
// them a readonly ion-input) took too much space in a side menu — collapse
// it behind one tappable row, using Ionic's own chevron icon for the
// expand/collapse control (no emoji), mirroring the requested
// "## copyright line [chevron] / --- Version / Build" shape.
//
// No ion-input: a readonly ion-input breaks Playwright locators
// (.inputValue() needs a native form control; ion-input is a Stencil
// shadow-DOM component) — plain ion-item/ion-label/ion-note here so
// build-info-version/build-info-hash are ordinary text nodes.
@Component({
  selector: 'sneat-app-version',
  templateUrl: 'app-version.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon, IonItem, IonLabel, IonNote],
})
export class AppVersionComponent {
  // BUILD_INFO is optional so @sneat/components keeps working, unchanged,
  // for every consumer that has not called provideBuildInfo() yet — it
  // falls back to the never-restamped placeholders committed to
  // ./build-info.ts. See @sneat/core-public's build-info.ts for why this is
  // a runtime DI contract rather than a compile-time import.
  protected readonly buildInfo: IBuildInfo =
    inject(BUILD_INFO, { optional: true }) ?? placeholderBuildInfo;
  protected readonly shortGitHash = this.buildInfo.gitHash.substring(0, 7);

  /**
   * Name of the copyright holder shown as a link in the collapsed row.
   * Defaults to Sneat.Work — the copyright holder for every Sneat app, per
   * founder ruling 2026-09-11. Override only for a genuinely different
   * rights holder (e.g. a white-labeled deployment).
   */
  readonly copyrightHolder = input('Sneat.Work');

  /** URL the `copyrightHolder` link points to. */
  readonly copyrightUrl = input('https://sneat.work');

  /** First year of the copyright range shown in the collapsed row. */
  readonly startYear = input(2020);

  protected readonly expanded = signal(false);

  // The copyright range must end with the build year, never a hand-committed
  // one, so it can't go stale. buildTimestamp is an ISO-8601 UTC instant
  // once stamped (see @sneat/build-info's README), but stays the committed
  // placeholder "timestamp t0be$et" whenever this renders off an unstamped
  // build — new Date(placeholder) is Invalid Date, so fall back to the
  // current year rather than rendering "NaN".
  protected readonly buildYear = computed(() => {
    const stamped = new Date(this.buildInfo.buildTimestamp).getUTCFullYear();
    return Number.isFinite(stamped) ? stamped : new Date().getUTCFullYear();
  });

  protected toggle(): void {
    this.expanded.update((expanded) => !expanded);
  }

  // The copyright link must open its target without also toggling the row —
  // the ion-item's own (click) handler would otherwise also fire on bubble.
  protected onLinkClick(event: Event): void {
    event.stopPropagation();
  }
}
