import React, { useState, useRef, useEffect } from "react";
import { Search, Bell, ChevronDown, Menu } from "lucide-react";
import { useAuth } from "../../../features/auth/hooks/useAuth.js";
import { useNotifications } from "../../../features/notifications/hooks/useNotifications.js";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../constants/routes.js";
import { Avatar } from "../ui/Avatar.jsx";

const ROLE_BADGE_STYLES = {
  admin: "bg-purple-50 text-purple-700",
  manager: "bg-indigo-50 text-indigo-700",
  member: "bg-slate-100 text-slate-600",
  user: "bg-slate-100 text-slate-600",
};

/**
 * Shared Layout Component: Navbar
 * Layer: shared/components/layout/
 * Responsibility: Top navigation header with centered search bar, hamburger toggle for mobile/tablet when sidebar is hidden, dynamic notification badge, and profile dropdown.
 */
export const Navbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const { unreadCount = 0 } = useNotifications();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const profileMenuRef = useRef(null);

  useEffect(() => {
    if (!isProfileOpen) return;

    const handleClickOutside = (event) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setIsProfileOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("pointerdown", handleClickOutside, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handleClickOutside, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isProfileOpen]);

  return (
    <header className="h-20 bg-white px-4 md:px-5 flex items-center justify-between sticky top-0 z-30 border-b border-slate-100/80">
      {/* Left: Mobile hamburger menu & logo (shown on < 1024px when sidebar is in drawer mode) */}
      <div className="flex items-center gap-2.5 sm:gap-3 lg:hidden">
        {/* Hamburger Menu Toggle */}
        <button
          onClick={onToggleSidebar}
          className="p-1.5 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors focus:outline-none"
          title="Toggle Navigation Menu"
          aria-label="Toggle navigation menu"
        >
          <Menu size={22} strokeWidth={2.2} />
        </button>

        <img
          src="/CloudAgentra_logo.png"
          alt="AgentraZira"
          className="w-9 h-9 object-contain drop-shadow-sm cursor-pointer transition-transform hover:scale-105"
          onClick={() => navigate(ROUTES.DASHBOARD)}
        />
        <span className="font-extrabold text-slate-900 text-lg tracking-tight hidden sm:inline-block">
          AgentraZira
        </span>
      </div>

      {/* Center: Search input with magnifying glass on the RIGHT */}
      <div className="flex-1 max-w-md mx-2 sm:mx-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search anything..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-5 pr-11 py-2.5 bg-[#F4F7FB] text-xs font-medium text-slate-800 rounded-full border border-transparent focus:border-indigo-300 focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
          />
          <button
            type="button"
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
          >
            <Search size={18} />
          </button>
        </div>
      </div>

      {/* Right: Notifications & User Profile */}
      <div className="flex items-center gap-5">
        {/* Notification Bell with Dynamic Badge */}
        <div className="relative cursor-pointer">
          <button
            className="p-2 text-slate-500 hover:text-indigo-600 transition-colors relative focus:outline-none"
            aria-label="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* User Profile Avatar with name, role, and dropdown arrow */}
        <div className="relative" ref={profileMenuRef}>
          <button
            type="button"
            onClick={() => setIsProfileOpen((prev) => !prev)}
            aria-haspopup="menu"
            aria-expanded={isProfileOpen}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-slate-50 transition-colors focus:outline-none"
          >
            <Avatar
              src={user?.avatar}
              name={user?.name}
              email={user?.email}
              size="sm"
              className="ring-2 ring-slate-100"
            />
            <div className="hidden sm:flex flex-col items-start text-left min-w-0">
              <span className="text-xs font-semibold text-slate-800 leading-tight max-w-32.5 truncate">
                {user?.name || "Team Member"}
              </span>
              <span
                className={`mt-0.5 text-[10px] font-semibold capitalize px-1.5 py-0.5 rounded-md leading-tight ${
                  ROLE_BADGE_STYLES[user?.role] || ROLE_BADGE_STYLES.user
                }`}
              >
                {user?.role || "user"}
              </span>
            </div>
            <ChevronDown size={15} className="text-slate-400 shrink-0" />
          </button>

          {/* Profile Dropdown */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-800 truncate">
                  {user?.name || "Team Member"}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {user?.email || ""}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsProfileOpen(false);
                  navigate(ROUTES.PROFILE);
                }}
                className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                My Profile
              </button>
              <button
                onClick={() => {
                  setIsProfileOpen(false);
                  navigate(ROUTES.SETTINGS);
                }}
                className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Settings
              </button>
              {user?.role === "admin" && (
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    navigate(ROUTES.ADMIN);
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-50 flex items-center justify-between"
                >
                  <span>Admin Console</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800">
                    Root
                  </span>
                </button>
              )}
              <div className="border-t border-slate-100 pt-1 hover:pointer">
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    logout();
                    navigate(ROUTES.LOGIN);
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
