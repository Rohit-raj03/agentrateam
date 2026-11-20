import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  UserPlus,
  X,
  ShieldCheck,
  Mail,
  Check,
  Search,
  Crown,
  Eye,
  UserCheck,
  Loader2,
  ChevronDown,
  Trash2,
  AlertCircle,
  Pencil,
  Edit3,
} from "lucide-react";
import { projectService } from "../services/project.service.js";
import { Avatar } from "../../../shared/components/ui/Avatar.jsx";
import { Button } from "../../../shared/components/ui/Button.jsx";
import { MemberRoleChip } from "./MemberRoleChip.jsx";
import { MemberSelector } from "../../../shared/components/ui/MemberSelector.jsx";
import { ASSIGNED_TAGS } from "../../../shared/data/assignedTags.js";

const ACCESS_ROLES = ["Admin", "Member", "Viewer"];

const SPECIALTY_ROLES = Array.from(
  new Set([
    "Project Lead",
    "Frontend Contributor",
    "Backend Contributor",
    "Full Stack Contributor",
    "UI/UX Designer",
    "QA Reviewer",
    "DevOps Engineer",
    "Contributor",
    ...Object.values(ASSIGNED_TAGS),
  ]),
);

const ROLE_BADGES = {
  Owner: {
    bg: "bg-purple-50 text-purple-700 border-purple-200",
    icon: Crown,
    label: "Project Owner",
  },
  Admin: {
    bg: "bg-indigo-50 text-primary border-indigo-200",
    icon: ShieldCheck,
    label: "Admin",
  },
  Member: {
    bg: "bg-blue-50 text-blue-700 border-blue-200",
    icon: UserCheck,
    label: "Member",
  },
  Viewer: {
    bg: "bg-slate-100 text-slate-700 border-slate-200",
    icon: Eye,
    label: "Viewer",
  },
};

/**
 * Feature Component: ProjectMembers
 * Layer: features/projects/components/
 * Responsibility: Full team member management for a project:
 * - List existing members with roles and avatars
 * - Search existing members
 * - Add eligible registered users with duplicate protection
 * - Assign and update roles (Owner, Admin, Member, Viewer)
 * - Remove members with permission validation and owner protection
 */
export const ProjectMembers = ({
  projectId,
  members = [],
  onTagMember,
  onUntagMember,
  onUpdateMemberRole,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [editRole, setEditRole] = useState("Member");
  const [editProjectRole, setEditProjectRole] = useState("Contributor");

  // Add Member State
  const [eligibleUsers, setEligibleUsers] = useState([]);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [selectedUsersToAdd, setSelectedUsersToAdd] = useState([]);
  const [newMemberRole, setNewMemberRole] = useState("Member");
  const newMemberProjectRole = "Contributor";
  const [addError, setAddError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter existing members
  const filteredExistingMembers = useMemo(() => {
    const q = memberSearchQuery.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        (m.name || "").toLowerCase().includes(q) ||
        (m.email || "").toLowerCase().includes(q) ||
        (m.username || "").toLowerCase().includes(q) ||
        (m.role || "").toLowerCase().includes(q) ||
        (m.projectRole || "").toLowerCase().includes(q),
    );
  }, [members, memberSearchQuery]);

  // Fetch eligible users when Add Member modal is opened
  useEffect(() => {
    if (!isAddModalOpen || !projectId) return;

    let isMounted = true;
    const fetchEligible = async () => {
      setLoadingEligible(true);
      try {
        const res = await projectService.getEligibleMembers(projectId, "");
        if (isMounted) {
          const list = res?.users || res?.data || [];
          setEligibleUsers(list);
        }
      } catch {
        if (isMounted) {
          setEligibleUsers([]);
        }
      } finally {
        if (isMounted) {
          setLoadingEligible(false);
        }
      }
    };

    fetchEligible();
    return () => {
      isMounted = false;
    };
  }, [isAddModalOpen, projectId]);

  // Combine eligible users with editing member so MemberSelector recognizes pre-filled member
  const selectorAvailableMembers = useMemo(() => {
    if (editingMemberId && selectedUsersToAdd.length > 0) {
      const exists = eligibleUsers.some(
        (u) => (u.id || u._id) === (selectedUsersToAdd[0].id || selectedUsersToAdd[0]._id),
      );
      if (!exists) {
        return [...selectedUsersToAdd, ...eligibleUsers];
      }
    }
    return eligibleUsers;
  }, [eligibleUsers, editingMemberId, selectedUsersToAdd]);

  const handleAddMemberSubmit = async (e) => {
    e?.preventDefault?.();
    if (selectedUsersToAdd.length === 0) {
      setAddError(
        editingMemberId
          ? "Please keep the member or click Cancel."
          : "Please search and select at least one team member to add.",
      );
      return;
    }

    setIsSubmitting(true);
    setAddError("");
    try {
      if (editingMemberId) {
        // Updating existing member roles with 100% preservation of multiple assigned tags
        const user = selectedUsersToAdd[0];
        const tags =
          Array.isArray(user?.tags) && user.tags.length > 0
            ? user.tags
            : Array.isArray(user?.projectRoles) && user.projectRoles.length > 0
            ? user.projectRoles
            : [user?.projectRole || "Contributor"];

        if (onUpdateMemberRole) {
          await onUpdateMemberRole(
            editingMemberId,
            newMemberRole,
            tags[0] || "Contributor",
            tags,
          );
        }
      } else if (onTagMember) {
        for (const user of selectedUsersToAdd) {
          const tags =
            user.tags ||
            user.projectRoles ||
            [user.projectRole || newMemberProjectRole || "Contributor"];
          const projRole = tags[0] || "Contributor";
          await onTagMember(user, projRole, newMemberRole, tags);
        }
      }
      setSelectedUsersToAdd([]);
      setEditingMemberId(null);
      setIsAddModalOpen(false);
    } catch (err) {
      setAddError(
        err?.message ||
          (editingMemberId
            ? "Failed to update member roles."
            : "Failed to add member to project."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditMember = (member) => {
    setEditingMemberId(member.id);
    setEditRole(member.role || "Member");
    setNewMemberRole(member.role || "Member");

    const rawRoles =
      Array.isArray(member.tags) && member.tags.length > 0
        ? member.tags
        : Array.isArray(member.projectRoles) && member.projectRoles.length > 0
        ? member.projectRoles
        : Array.isArray(member.projectRole) && member.projectRole.length > 0
        ? member.projectRole
        : typeof member.projectRole === "string" && member.projectRole.includes(",")
        ? member.projectRole.split(",").map((s) => s.trim()).filter(Boolean)
        : member.projectRole
        ? [member.projectRole]
        : ["Contributor"];

    const prefilledUser = {
      id: member.id || member._id || member.user?._id || member.user,
      _id: member.id || member._id || member.user?._id || member.user,
      name: member.name || member.user?.name,
      email: member.email || member.user?.email,
      username: member.username || member.user?.username,
      avatar: member.avatar || member.user?.avatar,
      role: member.role || "Member",
      projectRole: rawRoles[0] || "Contributor",
      projectRoles: rawRoles,
      tags: rawRoles,
    };

    setSelectedUsersToAdd([prefilledUser]);
    setAddError("");
    setIsAddModalOpen(true);
  };

  const handleSaveMemberRole = async (memberId) => {
    if (onUpdateMemberRole) {
      await onUpdateMemberRole(memberId, editRole, editProjectRole);
    }
    setEditingMemberId(null);
  };

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-primary flex items-center justify-center shadow-xs">
            <Users size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Project Team ({members.length})
              </h3>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {
                  members.filter(
                    (m) => m.role === "Admin" || m.role === "Owner",
                  ).length
                }{" "}
                Leads
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Manage team members, assign access privileges, and allocate
              project responsibilities.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Member Search input */}
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search members..."
              value={memberSearchQuery}
              onChange={(e) => setMemberSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all shadow-xs"
            />
          </div>

          <Button
            type="button"
            onClick={() => {
              setEditingMemberId(null);
              setIsAddModalOpen(true);
              setAddError("");
              setSelectedUsersToAdd([]);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary hover:bg-primary-hover active:scale-98 text-white text-xs font-bold shadow-md shadow-indigo-100 transition-all cursor-pointer"
          >
            <UserPlus size={16} />
            <span>Add Member</span>
          </Button>
        </div>
      </div>

      {/* Add / Edit Member Modal / Drawer Overlay */}
      {isAddModalOpen && (
        <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200/90 shadow-sm animate-in fade-in duration-150 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {editingMemberId ? (
                <Pencil size={16} className="text-primary" />
              ) : (
                <UserPlus size={16} className="text-primary" />
              )}
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                {editingMemberId
                  ? "Edit Member Role & Specialties"
                  : "Add Registered User to Project"}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingMemberId(null);
                setIsAddModalOpen(false);
                setSelectedUsersToAdd([]);
              }}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          {addError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-rose-500" />
              <span>{addError}</span>
            </div>
          )}

          {/* Canonical MemberSelector for Eligible Non-Members or Editing Member */}
          <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
            <MemberSelector
              value={selectedUsersToAdd}
              onChange={setSelectedUsersToAdd}
              availableMembers={selectorAvailableMembers}
              loading={loadingEligible}
              label={
                editingMemberId
                  ? "Configuring Project Roles"
                  : "Select Contributors to Add"
              }
              countLabel="selected"
              placeholder={
                editingMemberId
                  ? "Add or modify member roles & tags..."
                  : "Search eligible non-members by name, email, or role..."
              }
              emptyMessage={
                eligibleUsers.length === 0 && !loadingEligible && !editingMemberId
                  ? "All registered users are already in this project or none found."
                  : "No users selected yet. Search above to choose team members to add."
              }
              defaultRole={newMemberProjectRole || "Contributor"}
            />
          </div>

          {/* Project Access Level Configuration */}
          {selectedUsersToAdd.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 space-y-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Default Project Access Level
              </label>
              <select
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-800 focus:ring-2 focus:ring-primary"
              >
                {ACCESS_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setEditingMemberId(null);
                setIsAddModalOpen(false);
                setSelectedUsersToAdd([]);
              }}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddMemberSubmit}
              disabled={selectedUsersToAdd.length === 0 || isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary hover:bg-primary-hover active:scale-98 text-white text-xs font-bold shadow-md shadow-indigo-100 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>{editingMemberId ? "Saving..." : "Adding..."}</span>
                </>
              ) : (
                <>
                  <Check size={15} />
                  <span>
                    {editingMemberId
                      ? "Save Changes"
                      : `Add ${selectedUsersToAdd.length > 0 ? `${selectedUsersToAdd.length} Member${selectedUsersToAdd.length > 1 ? "s" : ""}` : "to Project"}`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Members Cards Grid */}
      {filteredExistingMembers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredExistingMembers.map((member) => {
            const roleInfo = ROLE_BADGES[member.role] || ROLE_BADGES.Member;
            const Icon = roleInfo.icon;
            const isOwner = member.role === "Owner";
            const isEditing = editingMemberId === member.id;

            // Extract all member project role tags
            const memberRoles = (() => {
              if (Array.isArray(member.tags) && member.tags.length > 0) return member.tags;
              if (Array.isArray(member.projectRoles) && member.projectRoles.length > 0) return member.projectRoles;
              if (Array.isArray(member.projectRole) && member.projectRole.length > 0) return member.projectRole;
              if (typeof member.projectRole === "string" && member.projectRole.includes(",")) {
                return member.projectRole.split(",").map((s) => s.trim()).filter(Boolean);
              }
              if (member.projectRole) return [member.projectRole];
              return ["Contributor"];
            })();

            return (
              <div
                key={member.id}
                className="p-4 bg-white rounded-2xl border border-slate-100 hover:border-indigo-100 hover:shadow-xs transition-all flex flex-col justify-between gap-3 group relative"
              >
                {/* Top Info */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <Avatar
                        src={member.avatar}
                        name={member.name}
                        email={member.email}
                        size="md"
                        className="ring-2 ring-slate-100"
                      />
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {member.name}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {member.email ||
                          (member.username ? `@${member.username}` : "Member")}
                      </p>
                    </div>
                  </div>

                  {/* Access Role Badge */}
                  <div className="shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleInfo.bg}`}
                    >
                      <Icon size={11} />
                      <span>{member.role || "Member"}</span>
                    </span>
                  </div>
                </div>

                {/* Project Role Tag Chips & Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2 min-h-8">
                  <div className="flex flex-wrap items-center gap-1 min-w-0 flex-1">
                    {memberRoles.map((roleTag) => (
                      <MemberRoleChip
                        key={roleTag}
                        tag={roleTag}
                        removable={false}
                        maxWidthClass="max-w-28 sm:max-w-36"
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                    {!isOwner && onUpdateMemberRole && (
                      <button
                        type="button"
                        onClick={() => startEditMember(member)}
                        title={`Edit roles for ${member.name}`}
                        className="p-1.5 text-slate-400 hover:text-primary hover:bg-indigo-50 rounded-xl transition-all cursor-pointer"
                        aria-label={`Edit roles for ${member.name}`}
                      >
                        <Pencil size={13} />
                      </button>
                    )}

                      {!isOwner && onUntagMember && (
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Remove ${member.name} from this project? They will also be removed from assigned tasks.`,
                              )
                            ) {
                              onUntagMember(member.id);
                            }
                          }}
                          title={`Remove ${member.name} from project`}
                          className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}

                      {isOwner && (
                        <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                          Owner
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        <div className="p-8 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
          <p className="text-xs font-medium text-slate-500">
            {memberSearchQuery
              ? `No members found matching "${memberSearchQuery}".`
              : "No team members tagged to this project yet."}
          </p>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="mt-2 text-xs font-bold text-primary hover:underline"
          >
            + Add registered team members now
          </button>
        </div>
      )}
    </div>
  );
};
