import { HttpErrorResponse } from '@angular/common/http';

export function ssoErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as { error?: unknown } | undefined;
    if (typeof body?.error === 'string' && body.error) {
      return body.error;
    }
  }
  return error instanceof Error && error.message
    ? error.message
    : 'The SSO request failed. Please try again.';
}
