import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Briefcase,
  Building,
} from "lucide-react";
import { invitationService } from "../../features/team/services/invitationService.js";
import { Input } from "../../shared/components/ui/Input.jsx";
import { Button } from "../../shared/components/ui/Button.jsx";
import { showToast } from "../../shared/utils/toast.js";
import { ROUTES } from "../../shared/constants/routes.js";
import { GoogleLoginButton } from "../../features/auth/components/GoogleLoginButton.jsx";
import { loginSuccess } from "../../features/auth/store/authSlice.js";

/**
 * Presentation Layer: AcceptInvitationPage
 * Layer: pages/auth/
 * Public ingress page for newly invited employees to verify invitation token, create password, and activate account.
 */
export const AcceptInvitationPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const token = searchParams.get("token") || "";

  const [verifying, setVerifying] = useState(true);
  const [invitationData, setInvitationData] = useState(null);
  const [verificationError, setVerificationError] = useState("");

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // 1. Verify Token on Mount
  useEffect(() => {
    let isMounted = true;

    const verify = async () => {
      if (!token || !token.trim()) {
        setVerificationError("No invitation token provided. Please use the complete link from your invitation email.");
        setVerifying(false);
        return;
      }

      try {
        const res = await invitationService.verifyToken(token.trim());
        if (isMounted) {
          const data = res?.data?.data || res?.data?.invitation || res?.data;
          setInvitationData(data);
          setName(data?.name || "");
          setVerifying(false);
        }
      } catch (err) {
        if (isMounted) {
          const msg =
            err.response?.data?.message ||
            err.message ||
            "This invitation link is invalid, expired, or has already been accepted.";
          setVerificationError(msg);
          setVerifying(false);
        }
      }
    };

    verify();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const validate = () => {
    const errs = {};
    if (!password) {
      errs.password = "Password is required";
    } else if (password.length < 6) {
      errs.password = "Password must be at least 6 characters long";
    }

    if (password !== confirmPassword) {
      errs.confirmPassword = "Passwords do not match";
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await invitationService.acceptInvitation({
        token: token.trim(),
        password,
        name: name.trim() || invitationData?.name,
      });

      if (res?.data?.accessToken) {
        dispatch(loginSuccess(res.data));
        showToast.success("Account activated successfully! Welcome to your team.");
        navigate(ROUTES.DASHBOARD, { replace: true });
      } else {
        showToast.success(
          "Account activated successfully! Please sign in with your password."
        );
        navigate(ROUTES.LOGIN, {
          replace: true,
          state: { email: invitationData?.email, accepted: true },
        });
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Failed to activate account. The invitation may have expired.";
      showToast.error(msg);
      // If invitation is already accepted, expired, or invalid, present clear status
      if (err.response?.status === 400 || err.response?.status === 404) {
        setVerificationError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSuccess = useCallback(
    async (credential) => {
      setSubmitting(true);
      try {
        const res = await invitationService.acceptInvitation({
          token: token.trim(),
          credential,
        });

        if (res?.data?.accessToken) {
          dispatch(loginSuccess(res.data));
          showToast.success(
            "Invitation accepted via Google! Welcome to your team."
          );
          navigate(ROUTES.DASHBOARD, { replace: true });
        } else {
          showToast.success(
            "Account activated successfully! Please sign in."
          );
          navigate(ROUTES.LOGIN, {
            replace: true,
            state: { email: invitationData?.email, accepted: true },
          });
        }
      } catch (err) {
        const msg =
          err.response?.data?.message ||
          err.message ||
          "Failed to activate account with Google.";
        showToast.error(msg);
        if (err.response?.status === 400 || err.response?.status === 404) {
          setVerificationError(msg);
        }
      } finally {
        setSubmitting(false);
      }
    },
    [token, invitationData, dispatch, navigate]
  );

  const handleGoogleError = useCallback((err) => {
    showToast.error(err?.message || "Unable to initialize Google Sign In.");
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <img
          src="/CloudAgentra_logo.png"
          alt="AgentraZira Logo"
          className="w-14 h-14 object-contain mx-auto mb-3 drop-shadow-md"
        />
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          AgentraZira
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Complete your onboarding &amp; join your team
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
          {/* State 1: Verifying Token */}
          {verifying && (
            <div className="py-12 text-center space-y-3">
              <Loader2 size={36} className="animate-spin text-primary mx-auto" />
              <h3 className="text-base font-semibold text-slate-800">
                Verifying your invitation...
              </h3>
              <p className="text-xs text-slate-400">
                Please wait while we validate your secure token.
              </p>
            </div>
          )}

          {/* State 2: Verification Error (Expired, Revoked, Invalid) */}
          {!verifying && verificationError && (
            <div className="py-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle size={26} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Invitation Unavailable
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {verificationError}
                </p>
              </div>
              <div className="pt-2">
                <Link to={ROUTES.LOGIN}>
                  <Button variant="secondary" className="w-full">
                    Return to Login
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* State 3: Valid Token -> Acceptance Form */}
          {!verifying && !verificationError && invitationData && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Invitee Profile Summary Card */}
              <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Invited Role
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 capitalize">
                    {invitationData.role}
                  </span>
                </div>
                <div className="text-xs space-y-1 text-slate-600">
                  <div className="flex items-center gap-1.5 font-medium text-slate-800">
                    <User size={13} className="text-slate-400" />
                    <span>{invitationData.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail size={13} className="text-slate-400" />
                    <span>{invitationData.email}</span>
                  </div>
                  {invitationData.jobTitle && (
                    <div className="flex items-center gap-1.5">
                      <Briefcase size={13} className="text-slate-400" />
                      <span>{invitationData.jobTitle}</span>
                      {invitationData.jobProfile && (
                        <span>({invitationData.jobProfile})</span>
                      )}
                      {invitationData.department && (
                        <span>• {invitationData.department}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* One-Click Google Acceptance Option */}
              <div className="space-y-3 pt-1">
                <GoogleLoginButton
                  text="continue_with"
                  disabled={submitting}
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                />

                <div className="relative flex items-center justify-center my-2">
                  <div className="border-t border-slate-200 w-full" />
                  <span className="bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Or set a password
                  </span>
                </div>
              </div>

              {/* Full Name Confirmation */}
              <div>
                <Input
                  label="Full Name"
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  icon={User}
                  required
                  disabled={submitting}
                />
              </div>

              {/* Email (Read Only) */}
              <div>
                <Input
                  label="Email Address"
                  type="email"
                  name="email"
                  value={invitationData.email}
                  icon={Mail}
                  disabled
                  containerClassName="opacity-80"
                />
              </div>

              {/* New Password */}
              <div>
                <Input
                  label="Create Password"
                  type="password"
                  name="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={formErrors.password}
                  icon={Lock}
                  required
                  disabled={submitting}
                />
              </div>

              {/* Confirm Password */}
              <div>
                <Input
                  label="Confirm Password"
                  type="password"
                  name="confirmPassword"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  error={formErrors.confirmPassword}
                  icon={Lock}
                  required
                  disabled={submitting}
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submitting}
                  className="w-full py-3 flex items-center justify-center gap-2 text-sm font-semibold rounded-xl shadow-md shadow-primary/20"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Activating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Accept Invitation &amp; Join</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </Button>
              </div>

              <p className="text-center text-xs text-slate-400 pt-1">
                Already have an account?{" "}
                <Link
                  to={ROUTES.LOGIN}
                  className="font-semibold text-primary hover:underline"
                >
                  Log in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AcceptInvitationPage;
