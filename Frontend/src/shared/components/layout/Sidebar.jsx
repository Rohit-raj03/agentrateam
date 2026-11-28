import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  Calendar,
  BookOpen,
  FolderKanban,
  Settings,
  Send,
  FolderPlus,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";

import { ROUTES } from "../../constants/routes.js";

/**
 * Shared Layout Component: Sidebar
 * Layer: shared/components/layout/
 * Responsibility: Responsive navigation sidebar.
 * - Desktop (>= 1024px): Permanent in-flow sidebar with zero outer border radius,
 *   compact 240px width (or 68px collapsed), and smooth expand/collapse toggle.
 * - Mobile & Tablet (< 1024px): Clean slide-out overlay drawer (zero layout displacement when closed).
 */
export const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  // Remember collapsed preference across reloads
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem("agentrazira_sidebar_collapsed");
      if (saved !== null) return saved === "true";
    } catch {
      // ignore
    }
    return false;
  });

  const [activeTooltip, setActiveTooltip] = useState(null);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("agentrazira_sidebar_collapsed", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const primaryNavItems = [
    { label: "Dashboard", icon: LayoutGrid, to: ROUTES.DASHBOARD },
    { label: "Schedule", icon: Calendar, to: ROUTES.TIMELINE },
    { label: "Tasks", icon: BookOpen, to: ROUTES.TASKS },
    { label: "Projects", icon: FolderKanban, to: ROUTES.PROJECTS },
    {
      label: "Messages",
      icon: Send,
      to: ROUTES.MESSAGES,
      disabled: true,
      badge: "Soon",
    },
    { label: "Files", icon: FolderPlus, to: ROUTES.FILES },
  ];

  const settingsNavItem = {
    label: "Settings",
    icon: Settings,
    to: ROUTES.SETTINGS,
  };

  return (
    <>
      {/* ======================================================== */}
      {/* 1. MOBILE & TABLET DRAWER OVERLAY (< 1024px only)        */}
      {/* ======================================================== */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <aside className="relative z-10 w-60 h-full bg-white flex flex-col shadow-2xl border-r border-slate-200/80 rounded-none animate-in slide-in-from-left duration-200">
            {/* Drawer Header (Equal height h-20, larger logo and text) */}
            <div className="h-20 px-4 flex items-center justify-between shrink-0 border-b border-slate-200/80">
              <div
                onClick={() => {
                  navigate(ROUTES.DASHBOARD);
                  onClose?.();
                }}
                className="flex items-center gap-3 cursor-pointer min-w-0 group"
              >
                <img
                  src="/CloudAgentra_logo.png"
                  alt="AgentraZira"
                  className="w-9 h-9 object-contain shrink-0 drop-shadow-xs transition-transform group-hover:scale-105"
                />
                <span className="font-extrabold text-slate-900 text-lg tracking-tight truncate">
                  AgentraZira
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close navigation menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Nav Items */}
            <nav className="flex-1 flex flex-col gap-2.5 px-3 py-4 overflow-y-auto">
              {primaryNavItems.map((item) => {
                const Icon = item.icon;

                if (item.disabled) {
                  return (
                    <div
                      key={item.label}
                      className="flex items-center justify-between px-3.5 h-11 rounded-xl text-slate-400 bg-slate-50/60 cursor-not-allowed select-none text-sm border border-slate-100/60"
                      aria-disabled="true"
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          size={20}
                          strokeWidth={2.2}
                          className="text-slate-300"
                        />
                        <span className="truncate font-medium text-slate-400">
                          {item.label}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 border border-slate-200/80">
                        {item.badge || "Soon"}
                      </span>
                    </div>
                  );
                }

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 h-11 rounded-xl transition-colors ${
                        isActive
                          ? "bg-primary text-white shadow-xs font-semibold"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                      } text-sm`
                    }
                  >
                    <Icon size={20} strokeWidth={2.2} />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            {/* Drawer Settings at Bottom */}
            <div className="p-3 pb-5 border-t border-slate-100 shrink-0">
              <NavLink
                to={settingsNavItem.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 h-11 rounded-xl transition-colors ${
                    isActive
                      ? "bg-primary text-white shadow-xs font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                  } text-sm`
                }
              >
                {(() => {
                  const SettingsIcon = settingsNavItem.icon;
                  return <SettingsIcon size={20} strokeWidth={2.2} />;
                })()}
                <span className="truncate">{settingsNavItem.label}</span>
              </NavLink>
            </div>
          </aside>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. DESKTOP PERMANENT SIDEBAR (>= 1024px In-Flow only)    */}
      {/* ======================================================== */}
      <aside
        onMouseLeave={() => setActiveTooltip(null)}
        className={`hidden lg:flex flex-col shrink-0 h-screen bg-white border-r border-slate-200/80 rounded-none relative z-40 overflow-visible transition-all duration-200 ease-in-out ${
          isCollapsed ? "w-17" : "w-60"
        }`}
      >
        {/* Top Header / Branding Section (Equal height to Navbar h-20, aligned logo, text, and collapse toggle) */}
        <div
          className={`relative h-20 flex items-center shrink-0 border-b border-slate-200/80 ${
            isCollapsed ? "justify-center px-2" : "justify-between px-4"
          }`}
        >
          {isCollapsed ? (
            <div
              onClick={() => navigate(ROUTES.DASHBOARD)}
              className="flex items-center justify-center cursor-pointer group py-1"
              title="AgentraZira"
            >
              <img
                src="/CloudAgentra_logo.png"
                alt="AgentraZira"
                className="w-9 h-9 object-contain drop-shadow-xs transition-transform group-hover:scale-105"
              />
            </div>
          ) : (
            <div
              onClick={() => navigate(ROUTES.DASHBOARD)}
              className="flex items-center gap-3 cursor-pointer min-w-0 group"
            >
              <img
                src="/CloudAgentra_logo.png"
                alt="AgentraZira"
                className="w-9 h-9 object-contain shrink-0 drop-shadow-xs transition-transform group-hover:scale-105"
              />
              <span className="font-extrabold text-slate-900 text-lg tracking-tight truncate">
                AgentraZira
              </span>
            </div>
          )}

          {/* Collapse / Expand Toggle Button linked directly to Header Logo section */}
          <button
            type="button"
            onClick={handleToggleCollapse}
            className={`flex items-center justify-center p-1.5 rounded-xl text-slate-400 bg-transparent border border-transparent hover:text-slate-800 hover:bg-slate-100 hover:border-slate-300/80 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 ${
              isCollapsed
                ? "absolute right-0 translate-x-1/2 top-1/2 -translate-y-1/2 z-40"
                : "shrink-0"
            }`}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? (
              <PanelLeftOpen size={18} strokeWidth={1.8} />
            ) : (
              <PanelLeftClose size={18} strokeWidth={1.8} />
            )}
          </button>
        </div>

        {/* Primary Navigation Items with Increased Button Spacing */}
        <nav
          className={`flex-1 flex flex-col gap-2 px-3 py-4 ${
            isCollapsed ? "overflow-visible" : "overflow-y-auto no-scrollbar"
          }`}
        >
          {primaryNavItems.map((item) => {
            const Icon = item.icon;

            if (item.disabled) {
              return (
                <div
                  key={item.label}
                  onMouseEnter={() =>
                    isCollapsed && setActiveTooltip(item.label)
                  }
                  onFocus={() => isCollapsed && setActiveTooltip(item.label)}
                  onBlur={() => setActiveTooltip(null)}
                  aria-disabled="true"
                  className={`group relative flex items-center transition-all duration-150 cursor-not-allowed select-none ${
                    isCollapsed
                      ? "w-11 h-11 justify-center mx-auto rounded-xl opacity-50 hover:bg-slate-50/50"
                      : "w-full h-11 px-3.5 gap-3 rounded-xl opacity-60 hover:bg-slate-50/50"
                  }`}
                >
                  <Icon
                    size={20}
                    strokeWidth={2.2}
                    className="shrink-0 text-slate-400"
                  />

                  {!isCollapsed && (
                    <>
                      <span className="text-sm tracking-tight truncate font-medium text-slate-400">
                        {item.label}
                      </span>
                      <span className="ml-auto text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-400 border border-slate-200/80">
                        {item.badge || "Soon"}
                      </span>
                    </>
                  )}

                  {/* Tooltip in Compact Collapsed Mode */}
                  {isCollapsed && activeTooltip === item.label && (
                    <span
                      className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2
                        bg-slate-900 text-white text-xs font-semibold
                        px-2.5 py-1 rounded-lg whitespace-nowrap shadow-lg
                        z-60 pointer-events-none animate-in fade-in zoom-in-95 duration-150 flex items-center"
                    >
                      <span>
                        {item.label} {item.badge && `(${item.badge})`}
                      </span>
                      <span className="absolute -left-1 top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
                    </span>
                  )}
                </div>
              );
            }

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onMouseEnter={() => isCollapsed && setActiveTooltip(item.to)}
                onFocus={() => isCollapsed && setActiveTooltip(item.to)}
                onBlur={() => setActiveTooltip(null)}
                aria-label={item.label}
                className={({ isActive }) =>
                  `group relative flex items-center transition-all duration-150 ${
                    isCollapsed
                      ? "w-11 h-11 justify-center mx-auto rounded-xl"
                      : "w-full h-11 px-3.5 gap-3 rounded-xl"
                  } ${
                    isActive
                      ? "bg-primary text-white shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={20}
                      strokeWidth={2.2}
                      className={`shrink-0 transition-colors ${
                        isActive
                          ? "text-white"
                          : "text-slate-400 group-hover:text-slate-700"
                      }`}
                    />

                    {!isCollapsed && (
                      <span
                        className={`text-sm tracking-tight truncate transition-colors ${
                          isActive
                            ? "font-semibold text-white"
                            : "font-medium text-slate-600 group-hover:text-slate-900"
                        }`}
                      >
                        {item.label}
                      </span>
                    )}

                    {/* Tooltip in Compact Collapsed Mode */}
                    {isCollapsed && activeTooltip === item.to && (
                      <span
                        className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2
                          bg-slate-900 text-white text-xs font-semibold
                          px-2.5 py-1 rounded-lg whitespace-nowrap shadow-lg
                          z-60 pointer-events-none animate-in fade-in zoom-in-95 duration-150"
                      >
                        {item.label}
                        <span className="absolute -left-1 top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Section: Divider & Settings with Increased Spacing */}
        <div className="px-3 pb-5 pt-2 shrink-0">
          <div className="border-t border-slate-200/70 my-2 mx-1" />
          <NavLink
            to={settingsNavItem.to}
            onMouseEnter={() =>
              isCollapsed && setActiveTooltip(settingsNavItem.to)
            }
            onFocus={() => isCollapsed && setActiveTooltip(settingsNavItem.to)}
            onBlur={() => setActiveTooltip(null)}
            aria-label={settingsNavItem.label}
            className={({ isActive }) =>
              `group relative flex items-center transition-all duration-150 ${
                isCollapsed
                  ? "w-11 h-11 justify-center mx-auto rounded-xl"
                  : "w-full h-11 px-3.5 gap-3 rounded-xl"
              } ${
                isActive
                  ? "bg-primary text-white shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium"
              }`
            }
          >
            {({ isActive }) => {
              const SettingsIcon = settingsNavItem.icon;
              return (
                <>
                  <SettingsIcon
                    size={20}
                    strokeWidth={2.2}
                    className={`shrink-0 transition-colors ${
                      isActive
                        ? "text-white"
                        : "text-slate-400 group-hover:text-slate-700"
                    }`}
                  />

                  {!isCollapsed && (
                    <span
                      className={`text-sm tracking-tight truncate transition-colors ${
                        isActive
                          ? "font-semibold text-white"
                          : "font-medium text-slate-600 group-hover:text-slate-900"
                      }`}
                    >
                      {settingsNavItem.label}
                    </span>
                  )}

                  {isCollapsed && activeTooltip === settingsNavItem.to && (
                    <span
                      className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2
                        bg-slate-900 text-white text-xs font-semibold
                        px-2.5 py-1 rounded-lg whitespace-nowrap shadow-xl
                        z-60 pointer-events-none animate-in fade-in zoom-in-95 duration-150"
                    >
                      {settingsNavItem.label}
                      <span className="absolute -left-1 top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
                    </span>
                  )}
                </>
              );
            }}
          </NavLink>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
