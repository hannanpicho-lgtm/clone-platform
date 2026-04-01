import { useState } from 'react';
import { safeFetch } from '/src/utils/safeFetch';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { getCurrentTenantBranding } from '../branding/tenantBranding';
import { getTenantUiBundle } from '../tenants/registry';

interface AdminLoginProps {
  onLoginSuccess: (auth?: { accessToken?: string; isSuperAdmin: boolean; permissions?: string[] }) => void;
}

export function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const branding = getCurrentTenantBranding();
  const tenantUi = getTenantUiBundle(branding.tenantId);
  const TenantAdminLoginPresentation = tenantUi.adminLoginPresentation;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const normalizedUsername = username.trim();
      const normalizedSecret = password.trim();

      if (normalizedUsername) {
        const response = await safeFetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/admin/signin`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username: normalizedUsername, password }),
          }
        );

        if (!response || !response.ok) {
          const errorData = response ? await response.json().catch(() => ({})) : {};
          const backendMessage = errorData?.error || 'Invalid admin credentials';
          setError(`${backendMessage}. If you are using the super admin key, clear the username field and enter only the key in the password box.`);
          setIsLoading(false);
          return;
        }

        const loginData = await response.json().catch(() => ({}));

        onLoginSuccess({
          accessToken: loginData?.session?.access_token || undefined,
          isSuperAdmin: false,
          permissions: Array.isArray(loginData?.admin?.permissions) ? loginData.admin.permissions : [],
        });
        return;
      }

      const superAdminResponse = await safeFetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/admin/validate-super-key`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${normalizedSecret}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!superAdminResponse || !superAdminResponse.ok) {
        const errorData = superAdminResponse ? await superAdminResponse.json().catch(() => ({})) : {};
        setError(errorData?.error || 'Invalid super admin key');
        setIsLoading(false);
        return;
      }

      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('superAdminKey', normalizedSecret);
      }

      onLoginSuccess({ accessToken: normalizedSecret, isSuperAdmin: true, permissions: ['*'] });
    } catch {
      setError('Unable to authenticate admin login');
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <TenantAdminLoginPresentation
      branding={branding}
      username={username}
      setUsername={setUsername}
      password={password}
      setPassword={setPassword}
      isLoading={isLoading}
      error={error}
      handleLogin={handleLogin}
    />
  );
}