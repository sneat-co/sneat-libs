/**
 * Accepts only a same-origin application path and refuses credential-like
 * query parameter names and all fragments before placing a continuation in an
 * auth link or short-lived browser state. Callers should construct continuations
 * from known route state; this helper cannot identify secrets hidden in arbitrary
 * parameter values.
 */
export function safeAuthReturnPath(
  value: string | null | undefined,
): string | undefined {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    value.includes('#') ||
    // eslint-disable-next-line no-control-regex -- URLs may normalize controls during parsing.
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return undefined;
  }

  try {
    const url = new URL(value, 'https://sneat.invalid');
    if (url.origin !== 'https://sneat.invalid') return undefined;
    const decodedPath = decodeURIComponent(url.pathname);
    if (
      !url.pathname.startsWith('/') ||
      url.pathname.startsWith('//') ||
      decodedPath.startsWith('//') ||
      decodedPath.includes('\\') ||
      // eslint-disable-next-line no-control-regex -- Reject decoded controls too.
      /[\u0000-\u001f\u007f]/.test(decodedPath)
    ) {
      return undefined;
    }
    const credentialLikeQueryKey =
      /(token|secret|credential|password|authorization|api[_-]?key)/i;
    const authProtocolQueryKey =
      /(^|[_-])(auth|code|state|nonce|verifier)([_-]|$)/i;
    for (const key of url.searchParams.keys()) {
      if (
        credentialLikeQueryKey.test(key) ||
        authProtocolQueryKey.test(key)
      ) {
        return undefined;
      }
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return undefined;
  }
}
