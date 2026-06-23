import { Routes } from '@angular/router';
import { authRoutes } from '@sneat/auth-ui';
import { HomeComponent } from './home/home.component';

/**
 * Demo routes.
 *
 * - `''`        -> demo home (index of showcased components)
 * - `authRoutes` -> the REAL routes exported by `@sneat/auth-ui`, which mount
 *                   the library login page at `/login` via its own lazy route.
 * - `**`        -> catch-all back to home, so a post-login redirect to a path
 *                   that does not exist in the demo still lands somewhere.
 */
export const appRoutes: Routes = [
  { path: '', component: HomeComponent },
  ...authRoutes,
  { path: '**', redirectTo: '' },
];
