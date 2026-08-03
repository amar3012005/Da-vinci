import React from 'react';
import { AuthProvider } from './AuthProvider';
import LoginPage from './LoginPage';

// Keep the public sign-in surface out of the dashboard chunk. Loading a login
// page must not require the authenticated workspace and its route registry.
export default function HivemindLogin() {
  return (
    <AuthProvider>
      <LoginPage />
    </AuthProvider>
  );
}
