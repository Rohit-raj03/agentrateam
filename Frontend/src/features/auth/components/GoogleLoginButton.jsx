import React, { useEffect, useRef, useState } from "react";
import { env } from "../../../config/env.js";

/**
 * Feature Component: GoogleLoginButton
 * Responsibility: Renders official Google Identity Services (GIS) Sign-In button
 * without any external npm packages or peer-dependency conflicts.
 */
let isGoogleInitialized = false;
let activeCallback = null;

export const GoogleLoginButton = ({
  onSuccess,
  onError,
  disabled = false,
  text = "continue_with",
}) => {
  const buttonRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const callbacksRef = useRef({ onSuccess, onError });

  useEffect(() => {
    callbacksRef.current = { onSuccess, onError };
  }, [onSuccess, onError]);

  useEffect(() => {
    if (!env.GOOGLE_CLIENT_ID) {
      if (import.meta.env.DEV) {
        console.warn(
          "VITE_GOOGLE_CLIENT_ID is not configured in environment. Google Sign-In is disabled."
        );
      }
      return;
    }

    let checkInterval = null;

    const handleGoogleResponse = (response) => {
      if (response?.credential) {
        callbacksRef.current.onSuccess?.(response.credential);
      } else {
        callbacksRef.current.onError?.(
          new Error("No credential returned from Google")
        );
      }
    };

    activeCallback = handleGoogleResponse;

    const setupGoogleButton = () => {
      if (typeof window === "undefined" || !window.google?.accounts?.id) {
        return false;
      }

      try {
        // Initialize Google Identity Services only ONCE per application session
        if (!isGoogleInitialized) {
          window.google.accounts.id.initialize({
            client_id: env.GOOGLE_CLIENT_ID,
            callback: (res) => {
              activeCallback?.(res);
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });
          isGoogleInitialized = true;
        }

        // Render the button into the current container
        if (buttonRef.current) {
          buttonRef.current.innerHTML = "";
          window.google.accounts.id.renderButton(buttonRef.current, {
            theme: "outline",
            size: "large",
            width: "360",
            text, // "signin_with" | "signup_with" | "continue_with"
            shape: "rectangular",
            logo_alignment: "center",
          });
        }

        setIsReady(true);
        return true;
      } catch (err) {
        console.error("Failed to render Google Sign-In button:", err);
        callbacksRef.current.onError?.(err);
        return false;
      }
    };

    if (!setupGoogleButton()) {
      checkInterval = setInterval(() => {
        if (setupGoogleButton()) {
          clearInterval(checkInterval);
          checkInterval = null;
        }
      }, 200);
    }

    return () => {
      if (checkInterval) {
        clearInterval(checkInterval);
      }
      if (activeCallback === handleGoogleResponse) {
        activeCallback = null;
      }
    };
  }, [text]);

  if (!env.GOOGLE_CLIENT_ID) {
    return (
      <div className="w-full flex flex-col items-center justify-center">
        <div className="w-full max-w-90 h-11 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-xs text-slate-400 font-medium px-4 text-center">
          Google Sign-In is not configured
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center justify-center">
      <div
        ref={buttonRef}
        className={`w-full flex justify-center min-h-11 transition-opacity duration-200 ${
          disabled ? "opacity-50 pointer-events-none" : "opacity-100"
        }`}
      />
      {!isReady && (
        <div className="w-full max-w-90 h-11 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-xs text-slate-400 font-medium">
          Loading Google Sign-In...
        </div>
      )}
    </div>
  );
};

export default GoogleLoginButton;
