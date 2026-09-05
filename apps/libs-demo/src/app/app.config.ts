import {
  ApplicationConfig,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/provide';
import { appRoutes } from './app.routes';
import { demoProviders } from './demo-providers';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideIonicAngular(),
    provideRouter(appRoutes),
    ...demoProviders,
  ],
};
