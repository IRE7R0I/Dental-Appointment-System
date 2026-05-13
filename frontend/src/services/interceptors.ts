/*
 * Interceptores JWT para api.ts.
 * Reemplaza el export default api del final con este bloque.
 *
 * Request: adjunta Bearer token desde localStorage.
 * Response: en 401 intenta refresh automático, si falla redirige a /login.
 */

import type { InternalAxiosRequestConfig } from 'axios';

// Guardamos referencia a la función refresh para evitar import circular
let _refreshFn: (() => Promise<boolean>) | null = null;

export function setRefreshFn(fn: () => Promise<boolean>) {
  _refreshFn = fn;
}

// Interceptor de Request
export function requestInterceptor(config: InternalAxiosRequestConfig) {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}

// Interceptor de Response
let isRefreshing = false;
let pendingRequests: Array<() => void> = [];

export function responseErrorInterceptor(error: any) {
  const originalRequest = error.config;

  // No interceptar /login ni /refresh
  if (
    originalRequest?.url?.includes('/auth/login') ||
    originalRequest?.url?.includes('/auth/refresh')
  ) {
    return Promise.reject(error);
  }

  if (error.response?.status === 401 && !originalRequest._retry) {
    if (isRefreshing) {
      // Si ya estamos refrescando, encolar hasta que termine
      return new Promise((resolve) => {
        pendingRequests.push(() => resolve(originalRequest));
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      localStorage.clear();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    return fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Refresh failed');
        return res.json();
      })
      .then((data) => {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        isRefreshing = false;
        // Procesar requests pendientes
        pendingRequests.forEach((cb) => cb());
        pendingRequests = [];
        return originalRequest;
      })
      .catch(() => {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      });
  }

  return Promise.reject(error);
}
