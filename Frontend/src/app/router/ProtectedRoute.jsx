import React, { useMemo, useState, useEffect } from "react";
import { Navigate, Outlet, Link } from "react-router-dom";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { useAuth } from "../../features/auth/hooks/useAuth.js";
import { authService } from "../../features/auth/services/auth.service.js";
import { ROUTES } from "../../shared/constants/routes.js";

export const ProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const [verifying, setVerifying] = useState(false);
  const [verifiedRole, setVerifiedRole] = useState(null);
  const [verificationFailed, setVerificationFailed] = useState(false);

  // Normalize allowedRoles to lowercase trimmed strings
  const normalizedAllowedRoles = useMemo(() => {
    if (
      !allowedRoles ||
      !Array.isArray(allowedRoles) ||
      allowedRoles.length === 0
    ) {
      return null;
    }
    return allowedRoles.map((r) => String(r).toLowerCase().trim());
  }, [allowedRoles]);

  const isRoleRestricted = Boolean(
    normalizedAllowedRoles && normalizedAllowedRoles.length > 0,
  );

  useEffect(() => {
    let isMounted = true;

    if (!isRoleRestricted || !isAuthenticated) {
      setVerifying(false);
      return;
    }

    setVerifying(true);
    setVerificationFailed(false);

    authService
      .getCurrentUser()
      .then((res) => {
        if (!isMounted) return;
        const freshUser = res?.user || res?.data?.user;
        if (!freshUser || !freshUser.role) {
          // Fail closed
          setVerificationFailed(true);
          setVerifiedRole(null);
        } else {
          setVerifiedRole(String(freshUser.role).toLowerCase().trim());
        }
      })
      .catch(() => {
        if (!isMounted) return;
        // Fail closed on error
        setVerificationFailed(true);
        setVerifiedRole(null);
      })
      .finally(() => {
        if (isMounted) {
          setVerifying(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isRoleRestricted, isAuthenticated]);

  // If initial auth token hydration is genuinely in-progress without user data, show brief loader
  if (loading && !user) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-surface-page">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not authenticated -> redirect to login
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // If route is role restricted, show loader while verifying against /auth/me
  if (isRoleRestricted && verifying) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-surface-page">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const effectiveRole = verifiedRole || (user?.role || "").toLowerCase().trim();

  // Role restricted and user does not have permission or verification failed -> fail closed
  if (
    isRoleRestricted &&
    (verificationFailed || !verifiedRole || !normalizedAllowedRoles.includes(verifiedRole))
  ) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
            <ShieldAlert size={28} />
          </div>

          <div className="space-y-1.5">
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100/70 px-2.5 py-0.5 rounded-full border border-amber-200">
              403 • Unauthorized
            </span>
            <h3 className="text-lg font-bold text-slate-900 pt-1">
              Access Restricted
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              You are signed in as{" "}
              <span className="font-semibold text-slate-800">
                {user?.name || user?.email || "User"}
              </span>{" "}
              with the role{" "}
              <span className="font-semibold text-slate-800 capitalize">
                "{effectiveRole || "Team Member"}"
              </span>
              . This section is restricted to{" "}
              <span className="font-semibold text-primary capitalize">
                {normalizedAllowedRoles.join(", ")}
              </span>{" "}
              accounts.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
            <Link
              to={ROUTES.DASHBOARD}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-2xl bg-primary hover:bg-primary-hover active:scale-98 text-white text-xs font-bold shadow-md shadow-indigo-100 transition-all cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;
