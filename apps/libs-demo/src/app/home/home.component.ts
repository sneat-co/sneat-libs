import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular/ion-content';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonItem } from '@ionic/angular/ion-item';
import { IonLabel } from '@ionic/angular/ion-label';
import { IonList } from '@ionic/angular/ion-list';
import { IonListHeader } from '@ionic/angular/ion-list-header';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToolbar } from '@ionic/angular/ion-toolbar';

interface IDemoEntry {
  readonly title: string;
  readonly path: string;
}

/** Index of components showcased by the demo app. Add an entry per component. */
const DEMO_ENTRIES: readonly IDemoEntry[] = [
  { title: 'Login page', path: '/login' },
];

@Component({
  selector: 'sneat-home',
  standalone: true,
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonListHeader,
    IonItem,
    IonLabel,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Sneat libs demo</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-list>
        <ion-list-header>Components</ion-list-header>
        @for (entry of entries; track entry.path) {
          <ion-item [routerLink]="entry.path" button="true" detail="true">
            <ion-label>{{ entry.title }}</ion-label>
          </ion-item>
        }
      </ion-list>
    </ion-content>
  `,
})
export class HomeComponent {
  protected readonly entries = DEMO_ENTRIES;
}
