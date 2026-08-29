import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonIcon,
  IonItem,
  IonLabel,
} from '@ionic/angular';
import { ISpaceContext } from '@sneat/space-models';
import { spacePageUrl } from '../space-base-component.directive';
import {
  SPACE_EXTENSION_NAV_ITEMS,
  SpaceExtensionLinksPresentation,
  SpaceExtensionNavAction,
  SpaceExtensionNavItem,
} from './space-extension-nav-item';

@Component({
  selector: 'sneat-space-extension-links',
  templateUrl: './space-extension-links.component.html',
  styles: `
    :host {
      display: block;
    }

    ion-item.currentPage ion-label.extension-title {
      font-weight: bold;
    }

    ion-item.last-extension-item {
      --border-width: 0;
      --inner-border-width: 0;
    }
  `,
  imports: [RouterLink, IonItem, IonIcon, IonLabel, IonButtons, IonButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpaceExtensionLinksComponent {
  private readonly configuredItems =
    inject(SPACE_EXTENSION_NAV_ITEMS, { optional: true }) ?? [];

  public readonly $space = input.required<ISpaceContext>();
  public readonly $items = input<readonly SpaceExtensionNavItem[]>(
    this.configuredItems,
  );
  public readonly $presentation =
    input<SpaceExtensionLinksPresentation>('menu');
  public readonly $currentPage = input('');
  public readonly $disabled = input(false);

  public readonly linkSelected = output<void>();

  protected readonly $visibleItems = computed(() => {
    const spaceType = this.$space().type;
    return this.$items().filter(
      (item) => !item.spaceTypes || item.spaceTypes.includes(spaceType || ''),
    );
  });

  protected itemUrl(path: string): string {
    return spacePageUrl(this.$space(), path) || '';
  }

  protected isCurrent(item: SpaceExtensionNavItem): boolean {
    const currentPage = this.$currentPage();
    return currentPage === item.id || currentPage === item.path;
  }

  protected visibleActions(
    item: SpaceExtensionNavItem,
  ): readonly SpaceExtensionNavAction[] {
    const presentation = this.$presentation();
    return (item.actions || []).filter(
      (action) =>
        !action.presentations || action.presentations.includes(presentation),
    );
  }

  protected onLinkSelected(): void {
    this.linkSelected.emit();
  }

  protected onActionSelected(event: Event): void {
    event.stopPropagation();
    this.linkSelected.emit();
  }
}
