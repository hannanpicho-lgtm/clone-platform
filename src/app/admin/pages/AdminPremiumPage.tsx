import { PremiumManagementPanel } from '../../components/PremiumManagementPanel';
import type { AdminSession } from '../types';
import { isSuperAdmin } from '../permissions';
import { AdminPageHeader } from '../components/AdminPageHeader';

interface AdminPremiumPageProps {
  session: AdminSession;
}

export function AdminPremiumPage({ session }: AdminPremiumPageProps) {
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Premium Products" description="Legacy premium management panel preserved under routed admin architecture." />
      <PremiumManagementPanel adminToken={session.accessToken} isSuperAdmin={isSuperAdmin(session)} />
    </div>
  );
}
