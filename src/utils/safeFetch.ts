/**
 * Safe fetch wrapper that suppresses "Failed to fetch" errors
 * and automatically falls back to demo mode behavior
 */
export async function safeFetch(
  url: string,
  options?: RequestInit
): Promise<Response | null> {
  try {
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    return response;
  } catch (error: any) {
    // Silently handle fetch errors
    console.log('ℹ️ Network request failed (backend not available)');
    return null;
  }
}

/**
 * Safe JSON fetch that returns null on error instead of throwing
 */
export async function safeFetchJSON<T = any>(
  url: string,
  options?: RequestInit
): Promise<T | null> {
  try {
    const response = await safeFetch(url, options);
    
    if (!response) {
      return null;
    }

    if (!response.ok) {
      console.log(`Request failed with status: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    console.log('ℹ️ JSON parsing failed or network error');
    return null;
  }
}

/**
 * Check if backend is available
 */
export async function checkBackendHealth(projectId: string): Promise<boolean> {
  const healthUrl = `https://${projectId}.supabase.co/functions/v1/make-server-44a642d3/health`;
  
  try {
    const response = await safeFetch(healthUrl);
    return response?.ok ?? false;
  } catch {
    return false;
  }
}
