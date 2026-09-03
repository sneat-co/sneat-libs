export interface SsoDiscovery {
  readonly domain: string;
  readonly configured: boolean;
  readonly fixedDomain: boolean;
}

export type SsoProtocol = 'oidc' | 'saml';

export type SsoProviderPreset =
  | 'entra'
  | 'okta'
  | 'keycloak'
  | 'generic_oidc'
  | 'generic_saml';

export interface SsoConfigRequest {
  readonly spaceID: string;
  readonly protocol: SsoProtocol;
  readonly providerPreset: SsoProviderPreset;
  readonly emailDomain: string;
  readonly issuer?: string;
  readonly clientID?: string;
  readonly clientSecret?: string;
  readonly loginHost?: string;
  readonly samlIdpMetadataXML?: string;
}

export interface SsoConfig {
  readonly spaceID: string;
  readonly protocol: SsoProtocol;
  readonly providerPreset?: SsoProviderPreset;
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
  readonly samlIdpEntityID?: string;
  readonly hasSamlMetadata: boolean;
  readonly domainVerification?: SsoDomainVerification;
  readonly verifiedAt?: string;
  readonly verifiedByUserID?: string;
  readonly disabledAt?: string;
}

export interface SsoDomainVerification {
  readonly recordName: string;
  readonly recordValue: string;
  readonly verifiedAt?: string;
}

export interface SsoDomainChallengeRequest {
  readonly spaceID: string;
  readonly emailDomain: string;
  readonly protocol: SsoProtocol;
  readonly providerPreset: SsoProviderPreset;
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
