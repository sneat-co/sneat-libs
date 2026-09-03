import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { sneatAuthGuard } from '@sneat/auth-core';

export const ssoRoutes: Routes = [
  {
    path: 'sso',
    loadComponent: () =>
      import('../sso/sso-login-page.component').then(
        (m) => m.SsoLoginPageComponent,
      ),
  },
  {
    path: 'sso/callback',
    loadComponent: () =>
      import('../sso/sso-callback-page.component').then(
        (m) => m.SsoCallbackPageComponent,
      ),
  },
  {
    path: 'sso/setup',
    canActivate: [sneatAuthGuard],
    loadComponent: () =>
      import('../sso/sso-onboarding-page.component').then(
        (m) => m.SsoOnboardingPageComponent,
      ),
  },
  {
    path: 'spaces/:spaceID/settings/sso',
    canActivate: [sneatAuthGuard],
    loadComponent: () =>
      import('../sso/sso-settings-page.component').then(
        (m) => m.SsoSettingsPageComponent,
      ),
  },
];

export const authRoutes: Routes = [
  ...ssoRoutes,
  {
    path: 'login',
    loadComponent: () =>
      import('./login-page/login-page.component').then(
        (m) => m.LoginPageComponent,
      ),
  },
  {
    path: 'sign-in-from-email-link',
    loadComponent: () =>
      import('./sign-in-from-email-link/sign-in-from-email-link-page.component').then(
        (m) => m.SignInFromEmailLinkPageComponent,
      ),
  },
];

@NgModule({
  imports: [RouterModule.forChild(authRoutes)],
  exports: [RouterModule],
})
export class SneatAuthRoutingModule {}
