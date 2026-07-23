import { InjectionToken } from '@angular/core';

export interface RuntimeConfig {
  apiBaseUrl: string;
}

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');
