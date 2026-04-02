import { useEffect, useRef, useState } from 'react';

const POLL_INTERVAL_MS = 5 * 60 * 1000; // check every 5 minutes

function extractBuildId(html: string): string | null {
  const match = html.match(/<meta name="build-id"\s+content="([^"]+)"/);
  return match ? match[1] : null;
}

/**
 * Polls the root document every 5 minutes (production only) and returns true
 * once a new build-id is detected — meaning a new deploy is live.
 */
export function useVersionCheck(): boolean {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const currentBuildId = useRef<string | null>(null);

  useEffect(() => {
    // Skip version polling in development to avoid noise.
    if (!import.meta.env.PROD) return;

    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch('/?_vcheck=' + Date.now(), {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        });
        if (!res.ok || cancelled) return;
        const html = await res.text();
        const buildId = extractBuildId(html);
        if (!buildId) return;

        if (currentBuildId.current === null) {
          // First check — record the current build as baseline.
          currentBuildId.current = buildId;
          return;
        }

        if (buildId !== currentBuildId.current) {
          setUpdateAvailable(true);
        }
      } catch {
        // Network offline or blocked — fail silently.
      }
    };

    check();
    const id = setInterval(check, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return updateAvailable;
}
