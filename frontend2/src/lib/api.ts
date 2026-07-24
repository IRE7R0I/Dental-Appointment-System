const getAuthToken = () => localStorage.getItem('access_token');
const getRefreshToken = () => localStorage.getItem('refresh_token');

export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  } as any;
  
  let response = await fetch(endpoint, {
    ...options,
    headers
  });
  
  if (response.status === 401) {
    const rToken = getRefreshToken();
    if (rToken) {
      try {
        const refreshResp = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: rToken })
        });
        if (refreshResp.ok) {
          const data = await refreshResp.json();
          localStorage.setItem('access_token', data.access_token);
          localStorage.setItem('refresh_token', data.refresh_token);
          
          // Retry original request
          const retryHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${data.access_token}`,
            ...(options.headers || {})
          };
          response = await fetch(endpoint, {
            ...options,
            headers: retryHeaders
          });
        } else {
          // Token invalid, clear local storage and redirect
          localStorage.clear();
          window.dispatchEvent(new Event('auth-expired'));
        }
      } catch (e) {
        localStorage.clear();
        window.dispatchEvent(new Event('auth-expired'));
      }
    } else {
      localStorage.clear();
      window.dispatchEvent(new Event('auth-expired'));
    }
  }
  
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Error ${response.status}`);
  }
  
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}
