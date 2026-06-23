import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';

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
