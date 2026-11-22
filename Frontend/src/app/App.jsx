import React, { useEffect } from 'react';
import { AppRouter } from './router/AppRouter.jsx';
import { useAuth } from '../features/auth/hooks/useAuth.js';
import { Toaster } from '../shared/components/ui/Toaster.jsx';

export const App = () => {
  const { checkAuth } = useAuth();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <>
      <Toaster />
      <AppRouter />
    </>
  );
};

export default App;
