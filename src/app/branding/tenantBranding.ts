export type FrontendTenantId = 'tank' | 'steadfast';

export interface TenantBranding {
  tenantId: FrontendTenantId;
  appName: string;
  logoText: string;
  loginTagline: string;
  footerText: string;
  adminPortalTitle: string;
  adminPortalSubtitle: string;
  adminGateTitle: string;
  adminGatePrompt: string;
  tickerText: string;
  homeCardBody: string;
}

const BRANDING_BY_TENANT: Record<FrontendTenantId, TenantBranding> = {
  tank: {
    tenantId: 'tank',
    appName: 'TankPlatform',
    logoText: 'TANK',
    loginTagline: 'Simulation RPG',
    footerText: '2024 TankPlatform. All rights reserved.',
    adminPortalTitle: 'TankPlatform Admin Portal',
    adminPortalSubtitle: 'TankPlatform Management',
    adminGateTitle: 'TankPlatform Admin Access',
    adminGatePrompt: 'Enter portal access key to continue.',
    tickerText: 'Welcome to Tanknewmedia for Innovative Software Development · Access Your VIP Data Platform · Manage Products & Earn Commissions · View Your Performance Metrics · Connect with Our Support Team',
    homeCardBody: 'Tanknewmedia offers custom software development services that help innovative companies and startups design and build digital products with AI, mobile, and web technologies.',
  },
  steadfast: {
    tenantId: 'steadfast',
    appName: 'Steadfast Workbench',
    logoText: 'STEADFAST',
    loginTagline: 'Secure Operations Console',
    footerText: '2024 Steadfast Workbench. All rights reserved.',
    adminPortalTitle: 'Steadfast Admin Portal',
    adminPortalSubtitle: 'Steadfast Management',
    adminGateTitle: 'Steadfast Admin Access',
    adminGatePrompt: 'Enter portal access key to continue.',
    tickerText: 'Welcome to Steadfast Workbench · Access Your VIP Data Platform · Manage Products & Earn Commissions · View Your Performance Metrics · Connect with Our Support Team',
    homeCardBody: 'Steadfast Workbench provides a secure and reliable platform for managing products, tracking performance, and growing your earnings with trusted enterprise-grade tools.',
  },
};

export const resolveFrontendTenantId = (hostOrHostname?: string | null): FrontendTenantId | null => {
  const explicit = String(import.meta.env.VITE_TENANT_ID || '').trim().toLowerCase();
  if (explicit === 'tank' || explicit === 'steadfast') {
    return explicit;
  }

  const host = String(hostOrHostname || '').trim().toLowerCase();
  if (!host) {
    return null;
  }
  if (host.includes('steadfast')) {
    return 'steadfast';
  }
  if (host.includes('tank')) {
    return 'tank';
  }
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return 'tank';
  }
  return null;
};

export const getTenantBranding = (tenantId: FrontendTenantId | null | undefined): TenantBranding => {
  const resolvedTenant = tenantId === 'steadfast' ? 'steadfast' : 'tank';
  return BRANDING_BY_TENANT[resolvedTenant];
};

export const getCurrentTenantBranding = (): TenantBranding => {
  if (typeof window === 'undefined') {
    return BRANDING_BY_TENANT.tank;
  }
  const tenantId = resolveFrontendTenantId(window.location.hostname);
  return getTenantBranding(tenantId);
};
