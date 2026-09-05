import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SneatUrlOperationBlocker } from '@sneat/core-public';
import { NEVER } from 'rxjs';

/** Keeps HttpClient consumers in their ordinary loading state without sending
 * transport requests when `#block=server-requests` is present. */
export const urlOperationBlockerInterceptor: HttpInterceptorFn = (
  request,
  next,
) =>
  inject(SneatUrlOperationBlocker).isBlocked('server-requests')
    ? NEVER
    : next(request);
