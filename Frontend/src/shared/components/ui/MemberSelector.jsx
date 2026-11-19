import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Search,
  X,
  Check,
  Plus,
  ChevronDown,
  Trash2,
  Tag,
  Loader2,
} from "lucide-react";
import { useTeam } from "../../../features/team/hooks/useTeam.js";
import { Avatar } from "./Avatar.jsx";
import { MemberRoleChip } from "../../../features/projects/components/MemberRoleChip.jsx";
import { ASSIGNED_TAGS, getRoleTagConfig } from "../../data/assignedTags.js";

const DEFAULT_QUICK_ROLES = Object.values(ASSIGNED_TAGS);

/**
 * Shared Core Component: MemberSelector
 * Layer: shared/components/ui/
 * Responsibility: Universal canonical Member Search and Selection component.
 *
 * Supports:
 * - Real-time member search
 * - Autocomplete search results dropdown
 * - Multi-select or single-select members
 * - Structured Two-Row card layout:
 *     - Header Row: Avatar + Name/Email (left) and [+ Role ∨] + [Trash] buttons (right)
 *     - Role Badges Row: Full-width horizontal flex-wrap container below header row
 * - Zero overlap between + Role button and role badges
 * - Configurable available roles and default role
 * - Loading, empty, and read-only states
 */
export const MemberSelector = ({
  value,
  taggedMembers,
  selectedMembers,
  onChange,
  onAddMember: externalOnAddMember,
  onRemoveMember: externalOnRemoveMember,
  availableMembers,
  availableRoles = DEFAULT_QUICK_ROLES,
  defaultRole = "Contributor",
  label = "Team Members",
  placeholder = "Search team members by name, email, or role to add...",
  emptyMessage = "No team members added yet. Search above to add contributors.",
  countLabel = "added",
  showRoles = true,
  allowCustomRoles = true,
  maxSelection = Infinity,
  readOnly = false,
  loading = false,
  error,
  headerAction,
  themeColor: _themeColor = "#4361EE",
  transformOnAdd,
}) => {
  const { members: teamHookMembers = [] } = useTeam();
  const members =
    availableMembers && Array.isArray(availableMembers)
      ? availableMembers
      : teamHookMembers;

  // Unify incoming value (support value, taggedMembers, and selectedMembers props)
  const currentSelected = useMemo(() => {
    if (Array.isArray(value)) return value;
    if (Array.isArray(taggedMembers)) return taggedMembers;
    if (Array.isArray(selectedMembers)) return selectedMembers;
    return [];
  }, [value, taggedMembers, selectedMembers]);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [openPopoverMemberId, setOpenPopoverMemberId] = useState(null);
  const [customTagInput, setCustomTagInput] = useState("");

  const searchContainerRef = useRef(null);
  const popoverRef = useRef(null);

  // Close search dropdown or active role popover on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target)
      ) {
        setIsSearchOpen(false);
      }
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpenPopoverMemberId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getMemberId = (member) => {
    if (!member) return null;
    return (
      member.id ||
      member._id ||
      member.user?._id ||
      member.user?.id ||
      (typeof member.user === "string" ? member.user : null) ||
      (typeof member === "string" ? member : null)
    );
  };

  const isSelected = (memberId) => {
    return currentSelected.some(
      (m) => getMemberId(m)?.toString() === memberId?.toString(),
    );
  };

  const getMemberTags = (member) => {
    if (Array.isArray(member.tags) && member.tags.length > 0) {
      return member.tags;
    }
    if (Array.isArray(member.projectRoles) && member.projectRoles.length > 0) {
      return member.projectRoles;
    }
    if (Array.isArray(member.projectRole) && member.projectRole.length > 0) {
      return member.projectRole;
    }
    if (
      typeof member.projectRole === "string" &&
      member.projectRole.includes(",")
    ) {
      return member.projectRole
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (member.projectRole) {
      return [member.projectRole];
    }
    if (member.role && member.role !== "Member" && member.role !== "Admin") {
      return [member.role];
    }
    return [defaultRole];
  };

  const filteredSearchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return members.filter((m) => {
      const name = (m.name || m.user?.name || "").toLowerCase();
      const username = (m.username || m.user?.username || "").toLowerCase();
      const email = (m.email || m.user?.email || "").toLowerCase();
      const role = (m.role || m.projectRole || m.jobTitle || "").toLowerCase();
      return (
        name.includes(q) ||
        username.includes(q) ||
        email.includes(q) ||
        role.includes(q)
      );
    });
  }, [members, searchQuery]);

  const resolveInitialRole = (user) => {
    const title = (user.role || user.jobTitle || "").toLowerCase();
    if (
      title.includes("design") ||
      title.includes("ui") ||
      title.includes("ux")
    )
      return ASSIGNED_TAGS.UI_UX || "UI/UX";
    if (title.includes("frontend")) return ASSIGNED_TAGS.FRONTEND || "Frontend";
    if (title.includes("backend")) return ASSIGNED_TAGS.BACKEND || "Backend";
    if (title.includes("full") || title.includes("stack"))
      return ASSIGNED_TAGS.FULL_STACK || "Full Stack";
    if (title.includes("qa") || title.includes("test"))
      return ASSIGNED_TAGS.QA_REVIEWER || ASSIGNED_TAGS.TESTING || "Testing";
    if (title.includes("lead") || title.includes("manager"))
      return ASSIGNED_TAGS.PROJECT_LEAD || "Project Lead";
    if (title.includes("devops") || title.includes("cloud"))
      return ASSIGNED_TAGS.DEVOPS || "DevOps";
    if (title.includes("ai") || title.includes("ml"))
      return ASSIGNED_TAGS.AI_ML || "AI/ML";
    return defaultRole;
  };

  const handleAddMember = (user) => {
    const uId = getMemberId(user);
    if (isSelected(uId)) return;

    const initialRole = resolveInitialRole(user);

    let newMember;
    if (typeof transformOnAdd === "function") {
      newMember = transformOnAdd(user, initialRole);
    } else {
      newMember = {
        id: uId,
        _id: uId,
        name: user.name || user.user?.name,
        email: user.email || user.user?.email,
        username: user.username || user.user?.username,
        avatar: user.avatar || user.user?.avatar,
        role: user.role || "Member",
        projectRole: initialRole,
        projectRoles: [initialRole],
        tags: [initialRole],
      };
    }

    let updatedList;
    if (maxSelection === 1) {
      updatedList = [newMember];
    } else {
      updatedList = [...currentSelected, newMember];
    }

    onChange?.(updatedList);
    externalOnAddMember?.(newMember);

    setSearchQuery("");
    setIsSearchOpen(false);
  };

  const handleToggleTag = (memberId, role) => {
    const updated = currentSelected.map((m) => {
      const id = getMemberId(m);
      if (id?.toString() === memberId?.toString()) {
        const currentTags = getMemberTags(m);
        let newTags;
        if (currentTags.includes(role)) {
          newTags = currentTags.filter((t) => t !== role);
        } else {
          newTags = [...currentTags, role];
        }
        return {
          ...m,
          projectRole: newTags[0] || defaultRole,
          projectRoles: newTags,
          tags: newTags,
        };
      }
      return m;
    });
    onChange?.(updated);
  };

  const handleRemoveTag = (memberId, roleToRemove) => {
    const updated = currentSelected.map((m) => {
      const id = getMemberId(m);
      if (id?.toString() === memberId?.toString()) {
        const currentTags = getMemberTags(m);
        const newTags = currentTags.filter((t) => t !== roleToRemove);
        return {
          ...m,
          projectRole: newTags[0] || defaultRole,
          projectRoles: newTags,
          tags: newTags,
        };
      }
      return m;
    });
    onChange?.(updated);
  };

  const handleAddCustomTag = (memberId) => {
    const trimmed = customTagInput.trim();
    if (!trimmed) return;

    const updated = currentSelected.map((m) => {
      const id = getMemberId(m);
      if (id?.toString() === memberId?.toString()) {
        const currentTags = getMemberTags(m);
        if (currentTags.includes(trimmed)) return m;
        const newTags = [...currentTags, trimmed];
        return {
          ...m,
          projectRole: newTags[0] || trimmed,
          projectRoles: newTags,
          tags: newTags,
        };
      }
      return m;
    });
    onChange?.(updated);
    setCustomTagInput("");
  };

  const handleRemoveMember = (memberId) => {
    const targetMember = currentSelected.find(
      (m) => getMemberId(m)?.toString() === memberId?.toString(),
    );
    const updated = currentSelected.filter(
      (m) => getMemberId(m)?.toString() !== memberId?.toString(),
    );
    onChange?.(updated);
    externalOnRemoveMember?.(memberId, targetMember);

    if (openPopoverMemberId?.toString() === memberId?.toString()) {
      setOpenPopoverMemberId(null);
    }
  };

  const handleOpenPopover = (e, mId) => {
    e.stopPropagation();
    if (openPopoverMemberId?.toString() === mId?.toString()) {
      setOpenPopoverMemberId(null);
      return;
    }
    setOpenPopoverMemberId(mId);
    setCustomTagInput("");
  };

  return (
    <div className="space-y-3">
      {/* Section Header */}
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            {label}
            {currentSelected.length > 0 && (
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-primary">
                {currentSelected.length} {countLabel}
              </span>
            )}
          </label>
          {headerAction}
        </div>
      )}

      {/* 1. Search Bar at the TOP */}
      {!readOnly && (
        <div ref={searchContainerRef} className="relative">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder={placeholder}
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-xs bg-white placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setIsSearchOpen(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Autocomplete Search Dropdown */}
          {isSearchOpen && searchQuery.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-xl max-h-48 overflow-y-auto z-20 divide-y divide-slate-100">
              {loading ? (
                <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 size={14} className="animate-spin text-primary" />
                  <span>Searching members...</span>
                </div>
              ) : filteredSearchResults.length > 0 ? (
                filteredSearchResults.map((user) => {
                  const uId = getMemberId(user);
                  const alreadySelected = isSelected(uId);

                  return (
                    <div
                      key={uId}
                      onClick={() => {
                        if (!alreadySelected) handleAddMember(user);
                      }}
                      className={`flex items-center justify-between p-2.5 transition-colors ${
                        alreadySelected
                          ? "bg-slate-50/80 cursor-default"
                          : "hover:bg-indigo-50/50 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <Avatar
                          src={user.avatar || user.user?.avatar}
                          name={user.name || user.user?.name}
                          email={user.email || user.user?.email}
                          size="xs"
                          className="w-6 h-6 rounded-full shrink-0 ring-1 ring-slate-100"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {user.name || user.user?.name}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {user.email ||
                              user.user?.email ||
                              (user.username
                                ? `@${user.username}`
                                : user.role || user.jobTitle || "")}
                          </p>
                        </div>
                      </div>

                      {alreadySelected ? (
                        <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1 shrink-0">
                          <Check size={12} strokeWidth={2.5} />
                          <span>Added</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-primary flex items-center gap-1 hover:underline shrink-0">
                          <Plus size={12} strokeWidth={2.5} />
                          <span>Add</span>
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-3 text-center text-xs text-slate-400">
                  No team members found matching "{searchQuery}"
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. Added Members List: Two-Row Structured Card Layout */}
      <div className="space-y-2">
        {currentSelected.length > 0 ? (
          <div className="space-y-2">
            {currentSelected.map((member) => {
              const mId = getMemberId(member);
              const tags = getMemberTags(member);
              const isPopoverOpen =
                openPopoverMemberId?.toString() === mId?.toString();

              return (
                <div
                  key={mId}
                  className="p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 bg-white hover:border-slate-300 transition-all shadow-2xs"
                >
                  {/* Header Row: Left User Info & Right Actions */}
                  <div className="flex items-center justify-between gap-3">
                    {/* Left: Avatar + Name and truncated email */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <Avatar
                        src={member.avatar || member.user?.avatar}
                        name={member.name || member.user?.name}
                        email={member.email || member.user?.email}
                        size="sm"
                        className="w-9 h-9 rounded-full shrink-0 ring-1 ring-slate-100"
                      />
                      <div className="min-w-0 flex-1 truncate">
                        <p className="text-xs font-bold text-slate-800 truncate leading-tight">
                          {member.name || member.user?.name}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {member.email ||
                            member.user?.email ||
                            (member.username
                              ? `@${member.username}`
                              : member.role || "")}
                        </p>
                      </div>
                    </div>

                    {/* Right Actions: [+ Role ∨] Trigger + Trash Button */}
                    {!readOnly && (
                      <div className="flex items-center gap-2 shrink-0">
                        {showRoles && (
                          <div className="relative inline-block">
                            <button
                              type="button"
                              onClick={(e) => handleOpenPopover(e, mId)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                isPopoverOpen
                                  ? "bg-primary text-white border-primary shadow-xs"
                                  : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/90 hover:border-slate-300"
                              }`}
                              title="Add or toggle roles"
                            >
                              <Plus size={12} strokeWidth={2.5} />
                              <span>Role</span>
                              <ChevronDown
                                size={12}
                                className={`transition-transform duration-150 ${
                                  isPopoverOpen ? "rotate-180" : ""
                                }`}
                              />
                            </button>

                            {/* Dropdown Menu Popover */}
                            {isPopoverOpen && (
                              <div
                                ref={popoverRef}
                                className="absolute top-full right-0 mt-1.5 z-50 w-56 sm:w-60 bg-white rounded-2xl border border-slate-200 shadow-2xl p-2.5 space-y-2 animate-in fade-in zoom-in-95 duration-100"
                              >
                                {/* Popover Header */}
                                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 text-[11px] font-bold text-slate-700">
                                  <span className="flex items-center gap-1">
                                    <Tag size={12} className="text-primary" />
                                    <span>Select Roles</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenPopoverMemberId(null);
                                    }}
                                    className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>

                                {/* Custom Role Input */}
                                {allowCustomRoles && (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={customTagInput}
                                      onChange={(e) =>
                                        setCustomTagInput(e.target.value)
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          handleAddCustomTag(
                                            openPopoverMemberId,
                                          );
                                        }
                                      }}
                                      placeholder="Custom role..."
                                      className="flex-1 px-2 py-1 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary text-slate-800 placeholder-slate-400"
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleAddCustomTag(openPopoverMemberId)
                                      }
                                      disabled={!customTagInput.trim()}
                                      className="p-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white disabled:opacity-40 transition-colors cursor-pointer shrink-0"
                                      title="Add custom role"
                                    >
                                      <Plus size={11} strokeWidth={2.5} />
                                    </button>
                                  </div>
                                )}

                                {/* Quick Roles Checkbox List */}
                                <div className="max-h-44 overflow-y-auto space-y-0.5 divide-y divide-slate-50 pr-0.5">
                                  {availableRoles.map((role) => {
                                    const activeMember = currentSelected.find(
                                      (m) =>
                                        getMemberId(m)?.toString() ===
                                        openPopoverMemberId?.toString(),
                                    );
                                    const activeMemberTags = activeMember
                                      ? getMemberTags(activeMember)
                                      : [];
                                    const isChecked =
                                      activeMemberTags.includes(role);
                                    return (
                                      <div
                                        key={role}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleToggleTag(
                                            openPopoverMemberId,
                                            role,
                                          );
                                        }}
                                        className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors text-xs select-none"
                                      >
                                        <div className="flex items-center gap-1.5 min-w-0 pr-2">
                                          {(() => {
                                            const {
                                              Icon: RoleIcon,
                                              color: iconColor,
                                            } = getRoleTagConfig(role);
                                            return (
                                              <RoleIcon
                                                size={12}
                                                strokeWidth={2.2}
                                                style={{
                                                  color: iconColor,
                                                  flexShrink: 0,
                                                }}
                                                className="shrink-0"
                                              />
                                            );
                                          })()}
                                          <span
                                            className={`text-[11px] truncate ${
                                              isChecked
                                                ? "text-primary font-bold"
                                                : "text-slate-700 font-medium"
                                            }`}
                                          >
                                            {role}
                                          </span>
                                        </div>
                                        <div
                                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                                            isChecked
                                              ? "bg-primary border-primary text-white"
                                              : "border-slate-300 bg-white"
                                          }`}
                                        >
                                          {isChecked && (
                                            <Check size={10} strokeWidth={3} />
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRemoveMember(mId)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title={`Remove ${member.name || member.user?.name || "member"}`}
                          aria-label={`Remove ${member.name || member.user?.name || "member"}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Role Badges Row: Rendered horizontally below the header row with full width */}
                  {showRoles && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                      {tags.length > 0 ? (
                        tags.map((tag) => (
                          <MemberRoleChip
                            key={tag}
                            tag={tag}
                            removable={!readOnly}
                            onRemove={() => handleRemoveTag(mId, tag)}
                          />
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          No roles assigned
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-3 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-slate-400 text-xs font-medium">
            {emptyMessage}
          </div>
        )}
      </div>

      {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
    </div>
  );
};

export default MemberSelector;
