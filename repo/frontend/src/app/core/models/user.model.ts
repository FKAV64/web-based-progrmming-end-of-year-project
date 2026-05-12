export type Role = 'USER' | 'ADMIN';
export type Theme = 'LIGHT' | 'DARK' | 'SYSTEM';
export type Currency = 'USD' | 'EUR' | 'TRY';
export type Locale = 'TR' | 'EN';

export interface UserSettings {
  theme: Theme;
  currency: Currency;
  locale: Locale;
  notificationsEnabled: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  emailVerifiedAt: string | null;
  createdAt: string;
  settings: UserSettings | null;
}

export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: { code: string; message: string };
}
