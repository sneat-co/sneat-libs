import { Provider } from '@angular/core';
import { APP_INFO, IAppInfo } from '@sneat/core-public';

export function provideAppInfo(appInfo: IAppInfo): Provider {
  return { provide: APP_INFO, useValue: appInfo };
}
