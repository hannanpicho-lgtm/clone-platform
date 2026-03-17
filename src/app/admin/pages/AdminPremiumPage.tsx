import { PremiumManagementPanel } from '../../components/PremiumManagementPanel';
import type { AdminSession } from '../types';
import { isSuperAdmin } from '../permissions';

interface AdminPremiumPageProps {
  session: AdminSession;
}

export function AdminPremiumPage({ session }: AdminPremiumPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Premium Products</h1>
        <p className="text-sm text-slate-500">Legacy premium management panel preserved under routed admin architecture.</p>
      </div>
      <PremiumManagementPanel adminToken={session.accessToken} isSuperAdmin={isSuperAdmin(session)} />
    </div>
  );
}
