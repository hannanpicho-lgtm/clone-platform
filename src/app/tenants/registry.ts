import type { FrontendTenantId } from '../branding/tenantBranding';
import type { TenantUiBundle } from './types';
import { TankAuthPresentation } from './tank/TankAuthPresentation';
import { TankAdminLoginPresentation } from './tank/TankAdminLoginPresentation';
import { SteadfastAuthPresentation } from './steadfast/SteadfastAuthPresentation';
import { SteadfastAdminLoginPresentation } from './steadfast/SteadfastAdminLoginPresentation';

const TENANT_UI_REGISTRY: Record<FrontendTenantId, TenantUiBundle> = {
  tank: {
    authPresentation: TankAuthPresentation,
    adminLoginPresentation: TankAdminLoginPresentation,
    appClassName: 'tenant-tank',
  },
  steadfast: {
    authPresentation: SteadfastAuthPresentation,
    adminLoginPresentation: SteadfastAdminLoginPresentation,
    appClassName: 'tenant-steadfast',
  },
};

export const getTenantUiBundle = (tenantId: FrontendTenantId | null | undefined): TenantUiBundle => {
  if (tenantId === 'steadfast') {
    return TENANT_UI_REGISTRY.steadfast;
  }
  return TENANT_UI_REGISTRY.tank;
};
