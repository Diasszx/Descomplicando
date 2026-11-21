import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Providers } from './providers';
import { ErrorBoundary } from './error-boundary';
import { DashboardView } from '@/features/dashboard/components/dashboard-view';
import {
  PendingSessionRoute,
  PublicOnlyRoute,
  RoleRouteGuard,
  RootRedirect,
} from '@/features/auth/components/route-guards';
import { LoginPage } from '@/features/auth/pages/login-page';
import { RegisterPage } from '@/features/auth/pages/register-page';
import { ForgotPasswordPage } from '@/features/auth/pages/forgot-password-page';
import { VerifyEmailPage } from '@/features/auth/pages/verify-email-page';
import { ForcePasswordChangePage } from '@/features/auth/pages/force-password-change-page';
import { MfaSetupPage } from '@/features/auth/pages/mfa-setup-page';
import { MfaVerifyPage } from '@/features/auth/pages/mfa-verify-page';
import {
  AdminHomePage,
  PacienteHomePage,
  ProfissionalHomePage,
} from '@/features/auth/pages/role-home-pages';

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Providers>
          <Routes>
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <LoginPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/cadastro"
              element={
                <PublicOnlyRoute>
                  <RegisterPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/recuperar-senha"
              element={
                <PublicOnlyRoute>
                  <ForgotPasswordPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/verificar-email"
              element={
                <PendingSessionRoute requiredStep="VERIFY_EMAIL">
                  <VerifyEmailPage />
                </PendingSessionRoute>
              }
            />
            <Route
              path="/primeiro-acesso/nova-senha"
              element={
                <PendingSessionRoute requiredStep="CHANGE_PASSWORD">
                  <ForcePasswordChangePage />
                </PendingSessionRoute>
              }
            />
            <Route
              path="/mfa/configurar"
              element={
                <PendingSessionRoute requiredStep="MFA_SETUP" allowOptionalMfaSetup>
                  <MfaSetupPage />
                </PendingSessionRoute>
              }
            />
            <Route
              path="/mfa/verificar"
              element={
                <PendingSessionRoute requiredStep="MFA_VERIFY">
                  <MfaVerifyPage />
                </PendingSessionRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <RoleRouteGuard allowedRoles={['ADMIN']}>
                  <AdminHomePage />
                </RoleRouteGuard>
              }
            />
            <Route
              path="/profissional"
              element={
                <RoleRouteGuard allowedRoles={['PROFISSIONAL']}>
                  <ProfissionalHomePage />
                </RoleRouteGuard>
              }
            />
            <Route
              path="/paciente"
              element={
                <RoleRouteGuard allowedRoles={['PACIENTE']}>
                  <PacienteHomePage />
                </RoleRouteGuard>
              }
            />
            <Route
              path="/dashboard"
              element={
                <RoleRouteGuard allowedRoles={['AUTONOMO']}>
                  <DashboardView />
                </RoleRouteGuard>
              }
            />
            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </Providers>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
