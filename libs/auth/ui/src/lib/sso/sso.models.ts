export interface SsoDiscovery {
  readonly domain: string;
  readonly configured: boolean;
  readonly fixedDomain: boolean;
}

export interface SsoConfigRequest {
  readonly spaceID: string;
  readonly emailDomain: string;
  readonly issuer: string;
  readonly clientID: string;
  readonly clientSecret: string;
  readonly loginHost?: string;
}

export interface SsoConfig {
  readonly spaceID: string;
  readonly protocol: 'oidc';
  readonly status:
    | 'draft'
    | 'configured'
    | 'verification_pending'
    | 'active'
    | 'disabled';
  readonly emailDomains: readonly string[];
  readonly issuer: string;
  readonly clientID: string;
  readonly hasClientSecret: boolean;
  readonly loginHosts?: readonly string[];
  readonly verifiedAt?: string;
  readonly verifiedByUserID?: string;
}

export interface SsoStart {
  readonly authorizationURL: string;
  readonly browserBinding: string;
}

export interface SsoExchange {
  readonly firebaseCustomToken: string;
  readonly userID: string;
  readonly spaceID: string;
}

export const ssoBrowserBindingStorageKey = 'sneat.sso.browser-binding.v1';

export function applicationBaseURL(): string {
  return document.baseURI.replace(/\/+$/, '');
}

export function emailDomain(email: string): string | undefined {
  const normalized = email.trim().toLowerCase();
  if (normalized.split('@').length !== 2) {
    return undefined;
  }
  const separator = normalized.lastIndexOf('@');
  if (separator <= 0 || separator === normalized.length - 1) {
    return undefined;
  }
  const domain = normalized.slice(separator + 1);
  return domain.includes('.') && !/[\s/@]/.test(domain) ? domain : undefined;
}
