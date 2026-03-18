import type React from 'react';
import type { TenantBranding } from '../branding/tenantBranding';

export interface TenantAuthPresentationProps {
  branding: TenantBranding;
  isSignup: boolean;
  isLoading: boolean;
  error: string;
  info: string;
  signupUsername: string;
  setSignupUsername: (value: string) => void;
  signupWithdrawalPassword: string;
  setSignupWithdrawalPassword: (value: string) => void;
  signupPassword: string;
  setSignupPassword: (value: string) => void;
  signupConfirmPassword: string;
  setSignupConfirmPassword: (value: string) => void;
  signupGender: string;
  setSignupGender: (value: string) => void;
  signupInviteCode: string;
  setSignupInviteCode: (value: string) => void;
  signinUsername: string;
  setSigninUsername: (value: string) => void;
  signinPassword: string;
  setSigninPassword: (value: string) => void;
  setIsSignup: (value: boolean) => void;
  handleSignup: (event: React.FormEvent) => Promise<void>;
  handleSignin: (event: React.FormEvent) => Promise<void>;
}

export interface TenantAdminLoginPresentationProps {
  branding: TenantBranding;
  username: string;
  setUsername: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  isLoading: boolean;
  error: string;
  handleLogin: (event: React.FormEvent) => Promise<void>;
}

export interface TenantUiBundle {
  authPresentation: React.ComponentType<TenantAuthPresentationProps>;
  adminLoginPresentation: React.ComponentType<TenantAdminLoginPresentationProps>;
  appClassName: string;
}
