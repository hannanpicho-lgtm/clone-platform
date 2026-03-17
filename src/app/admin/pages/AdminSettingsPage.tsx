import type { AdminSession } from '../types';
import { isSuperAdmin } from '../permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';

interface AdminSettingsPageProps {
  session: AdminSession;
}

export function AdminSettingsPage({ session }: AdminSettingsPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-slate-500">Legacy settings content preserved for VIP tier reference and admin governance notes.</p>
      </div>

      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <CardTitle>VIP Tiers Configuration</CardTitle>
          <CardDescription>Reference configuration displayed previously in the legacy admin settings tab.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          <p>Normal: 0.5% commission, 35 products, $99</p>
          <p>Silver: 0.8% commission, 40 products, $999</p>
          <p>Gold: 1.0% commission, 45 products, $2,999</p>
          <p>Platinum: 1.2% commission, 50 products, $4,999</p>
          <p>Diamond: 1.5% commission, 55 products, $9,999</p>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <CardTitle>Access Governance</CardTitle>
          <CardDescription>Role: {isSuperAdmin(session) ? 'Super-admin' : 'Sub-admin'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          <p>Sub-admin access remains permission-scoped and backend enforced.</p>
          <p>Use Sub-admins page for account provisioning and permissions.</p>
          <p>Use Support Links page for WhatsApp/Telegram link configuration.</p>
        </CardContent>
      </Card>
    </div>
  );
}
