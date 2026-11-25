import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  loginStart,
  loginSuccess,
  loginFailure,
  registerSuccess,
  updateUserProfile,
  clearError,
  setCredentials,
  logout as logoutAction,
} from '../store/authSlice.js';
import { authService } from '../services/auth.service.js';
import { apiClient } from '../../../shared/api/apiClient.js';
import { showToast } from '../../../shared/utils/toast.js';
import { clearTeamCache } from '../../team/hooks/useTeam.js';
import { clearNotificationsCache } from '../../notifications/hooks/useNotifications.js';
import { clearTasksCache } from '../../tasks/hooks/useTasks.js';
import { clearProjectsCache } from '../../projects/hooks/useProjects.js';

export function useAuth() {
  const dispatch = useDispatch();
  const { user, token, isAuthenticated, loading, error } = useSelector((state) => state.auth);

  const runAuthFlow = useCallback(
    async ({
      serviceCall,
      onSuccessAction,
      onSuccessToast,
      onErrorToast,
      fallbackErrorMsg,
    }) => {
      try {
        dispatch(loginStart());
        const data = await serviceCall();
        dispatch(onSuccessAction(data));
        onSuccessToast();
        return data;
      } catch (err) {
        const errMsg = err.message || fallbackErrorMsg;
        dispatch(loginFailure(errMsg));
        onErrorToast(err);
        throw err;
      }
    },
    [dispatch]
  );

  const login = useCallback(
    (credentials) =>
      runAuthFlow({
        serviceCall: () => authService.login(credentials),
        onSuccessAction: loginSuccess,
        onSuccessToast: showToast.auth.loginSuccess,
        onErrorToast: showToast.auth.loginError,
        fallbackErrorMsg: 'Login failed',
      }),
    [runAuthFlow]
  );

  const register = useCallback(
    (userData) =>
      runAuthFlow({
        serviceCall: () => authService.register(userData),
        onSuccessAction: registerSuccess,
        onSuccessToast: showToast.auth.registerSuccess,
        onErrorToast: showToast.auth.registerError,
        fallbackErrorMsg: 'Registration failed',
      }),
    [runAuthFlow]
  );

  const loginWithGoogle = useCallback(
    (credential) =>
      runAuthFlow({
        serviceCall: () => authService.googleLogin(credential),
        onSuccessAction: loginSuccess,
        onSuccessToast: showToast.auth.loginSuccess,
        onErrorToast: showToast.auth.loginError,
        fallbackErrorMsg: 'Google sign in failed',
      }),
    [runAuthFlow]
  );

  const checkAuth = useCallback(async () => {
    try {
      if (!token) {
        const response = await apiClient.post('/auth/refresh-token', {});
        const data = response?.data || response;
        const newAccessToken = data?.accessToken || data?.token;
        if (newAccessToken) {
          dispatch(
            setCredentials({
              accessToken: newAccessToken,
              user: data?.user,
            })
          );
          return data?.user;
        }
        return null;
      }
      const response = await authService.getCurrentUser();
      const freshUser = response?.user;
      if (freshUser) {
        dispatch(updateUserProfile(freshUser));
        return freshUser;
      }
      return null;
    } catch (err) {
      if (err?.status === 401 || err?.response?.status === 401) {
        dispatch(logoutAction());
      }
      return null;
    }
  }, [dispatch, token]);

  const updateProfile = useCallback((updatedFields) => {
    dispatch(updateUserProfile(updatedFields));
  }, [dispatch]);

  const clearAuthError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Best-effort logout; continue client teardown
    } finally {
      dispatch(logoutAction());
      clearTeamCache();
      clearNotificationsCache();
      clearTasksCache();
      clearProjectsCache();
      showToast.auth.logoutSuccess();
    }
  }, [dispatch]);

  return {
    user,
    token,
    isAuthenticated,
    loading,
    error,
    login,
    register,
    loginWithGoogle,
    checkAuth,
    updateProfile,
    clearAuthError,
    logout,
  };
}

export default useAuth;
