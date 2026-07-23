import { ApplicationConfig, APP_INITIALIZER, importProvidersFrom } from '@angular/core';
import { provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';

import { routes } from './app.routes';
import { API_BASE_URL } from './runtime-config';

export function initializeAppConfig(http: HttpClient) {
  return () => http.get<{ apiBaseUrl: string }>('/config.json', { responseType: 'json' as const }).toPromise().then((config) => {
    if (!config?.apiBaseUrl) {
      throw new Error('Missing apiBaseUrl in config.json');
    }
    (window as any).__runtimeConfig = config;
  });
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAppConfig,
      deps: [HttpClient],
      multi: true
    },
    {
      provide: API_BASE_URL,
      useFactory: () => {
        const config = (window as any).__runtimeConfig;
        return config?.apiBaseUrl || 'http://localhost:8080/meeting-planner';
      }
    }
  ]
};
