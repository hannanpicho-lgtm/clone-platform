console.log("main.tsx loaded");

import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";
import { getCurrentTenantBranding, resolveFrontendTenantId } from "./app/branding/tenantBranding";

const installTenantHeaderFetchWrapper = () => {
  if (typeof window === 'undefined') return;

  const originalFetch = window.fetch.bind(window);
  const tenantId = resolveFrontendTenantId(window.location.hostname);
  if (!tenantId) {
    return;
  }

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    const normalizedUrl = String(requestUrl || '');
    const targetsBackend = normalizedUrl.startsWith('https://')
      ? normalizedUrl.includes('/functions/v1/')
      : normalizedUrl.startsWith('/');

    if (!targetsBackend) {
      return originalFetch(input, init);
    }

    const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
    if (!headers.has('x-tenant-id')) {
      headers.set('x-tenant-id', tenantId);
    }

    return originalFetch(input, {
      ...init,
      headers,
    });
  };
};

if (typeof document !== 'undefined') {
  const branding = getCurrentTenantBranding();
  document.title = branding.appName;
}

installTenantHeaderFetchWrapper();

createRoot(document.getElementById("root")!).render(<App />);
