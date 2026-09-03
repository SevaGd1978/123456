// Utility for unified API calls with dynamic backend URL support for Android / Web

export const DEFAULT_REMOTE_URL = 'https://asking-tracked-palestinian-males.trycloudflare.com';

export function getApiBaseUrl(): string {
  const customUrl = localStorage.getItem('family_budget_api_url');
  if (customUrl) {
    return customUrl.replace(/\/$/, '');
  }

  // If running inside Capacitor Native Android WebView (where location.origin is http://localhost or capacitor://localhost)
  if (typeof window !== 'undefined') {
    const isCapacitor = (window as any).Capacitor?.isNativePlatform?.() || 
                        window.location.protocol === 'capacitor:' || 
                        window.location.hostname === 'localhost' && /Android/i.test(navigator.userAgent);
    
    // In Android webview without local backend on phone, connect to cloud URL
    if (isCapacitor) {
      return DEFAULT_REMOTE_URL;
    }
  }

  return '';
}

export function setApiBaseUrl(url: string) {
  if (!url) {
    localStorage.removeItem('family_budget_api_url');
  } else {
    localStorage.setItem('family_budget_api_url', url.replace(/\/$/, ''));
  }
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const baseUrl = getApiBaseUrl();
  const url = path.startsWith('http') ? path : `${baseUrl}${path}`;
  
  const token = localStorage.getItem('auth_token');
  const headers = new Headers(options.headers || {});
  
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  return fetch(url, {
    ...options,
    headers,
  });
}
