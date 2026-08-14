import { InjectionToken } from '@angular/core';

export interface ISneatAuthenticatedLifecycle { start(): void; }
export const SNEAT_AUTHENTICATED_LIFECYCLE = new InjectionToken<ISneatAuthenticatedLifecycle>('Sneat authenticated lifecycle');
