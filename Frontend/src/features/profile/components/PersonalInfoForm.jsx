import React from "react";
import { Card } from "../../../shared/components/ui/Card.jsx";
import {
  User,
  AtSign,
  Mail,
  Phone,
  Briefcase,
  MapPin,
  Globe,
  Building2,
  Award,
} from "lucide-react";
import {
  DEPARTMENT_OPTIONS,
  getResponsibilities,
} from "../../admin/constants/departments.js";

/**
 * Feature Component: PersonalInfoForm
 * Layer: features/profile/components/
 * Responsibility: Renders editable input fields for personal information (Name, Username, Email, Phone, Department, Team & Responsibility, Job Title, Bio, Location, Time Zone).
 */
export const PersonalInfoForm = ({ formData, errors, onChange }) => {
  const timezones = [
    "America/Los_Angeles (GMT-7:00)",
    "America/New_York (GMT-4:00)",
    "Europe/London (GMT+1:00)",
    "Europe/Berlin (GMT+2:00)",
    "Asia/Dubai (GMT+4:00)",
    "Asia/Kolkata (GMT+5:30)",
    "Asia/Singapore (GMT+8:00)",
    "Asia/Tokyo (GMT+9:00)",
    "Australia/Sydney (GMT+10:00)",
  ];

  const currentResponsibilities = getResponsibilities(formData.department);

  const handleDepartmentChange = (e) => {
    const newDept = e.target.value;
    const resps = getResponsibilities(newDept);
    const firstResp = resps[0];

    onChange("department", newDept);
    onChange("responsibility", firstResp ? firstResp.value : "");

    // Optionally suggest jobTitle if empty or matched an existing responsibility label
    const allLabels = Object.values(getResponsibilities(formData.department)).map(
      (r) => r.label
    );
    if (!formData.jobTitle || allLabels.includes(formData.jobTitle)) {
      if (firstResp) {
        onChange("jobTitle", firstResp.label);
      }
    }
  };

  const handleResponsibilityChange = (e) => {
    const newResp = e.target.value;
    onChange("responsibility", newResp);

    const found = currentResponsibilities.find((r) => r.value === newResp);
    if (
      found &&
      (!formData.jobTitle ||
        currentResponsibilities.some((r) => r.label === formData.jobTitle))
    ) {
      onChange("jobTitle", found.label);
    }
  };

  return (
    <Card className="p-6 md:p-8 space-y-6">
      {/* Section Header */}
      <div className="border-b border-slate-100 pb-4">
        <h3 className="text-base font-bold text-slate-900 tracking-tight">
          Personal Information
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Update your personal details, department, responsibility, contact info, and workspace presence.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Full Name */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">
            Full Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <User size={16} />
            </div>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => onChange("fullName", e.target.value)}
              placeholder="e.g. Angelina Davis"
              className={`w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] text-xs font-semibold text-slate-900 rounded-2xl border ${
                errors.fullName
                  ? "border-rose-400 focus:border-rose-500"
                  : "border-slate-200/80 focus:border-indigo-400"
              } focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all`}
            />
          </div>
          {errors.fullName && (
            <p className="text-[11px] text-rose-500 font-medium">
              {errors.fullName}
            </p>
          )}
        </div>

        {/* Username */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700">
              Username
            </label>
            <span className="text-[10px] text-slate-400 font-medium">Optional</span>
          </div>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <AtSign size={16} />
            </div>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => onChange("username", e.target.value)}
              placeholder="e.g. angelina"
              className={`w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] text-xs font-semibold text-slate-900 rounded-2xl border ${
                errors.username
                  ? "border-rose-400 focus:border-rose-500"
                  : "border-slate-200/80 focus:border-indigo-400"
              } focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all`}
            />
          </div>
          {errors.username && (
            <p className="text-[11px] text-rose-500 font-medium">
              {errors.username}
            </p>
          )}
        </div>

        {/* Email Address */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">
            Email Address <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <Mail size={16} />
            </div>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => onChange("email", e.target.value)}
              placeholder="you@agentrateam.io"
              className={`w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] text-xs font-semibold text-slate-900 rounded-2xl border ${
                errors.email
                  ? "border-rose-400 focus:border-rose-500"
                  : "border-slate-200/80 focus:border-indigo-400"
              } focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all`}
            />
          </div>
          {errors.email && (
            <p className="text-[11px] text-rose-500 font-medium">
              {errors.email}
            </p>
          )}
        </div>

        {/* Phone Number */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">
            Phone Number
          </label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <Phone size={16} />
            </div>
            <input
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => onChange("phoneNumber", e.target.value)}
              placeholder="+91 00000 00000"
              className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] text-xs font-semibold text-slate-900 rounded-2xl border border-slate-200/80 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
            />
          </div>
        </div>

        {/* Department */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">
            Department
          </label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <Building2 size={16} />
            </div>
            <select
              value={formData.department || ""}
              onChange={handleDepartmentChange}
              className="w-full pl-10 pr-8 py-2.5 bg-[#F8FAFC] text-xs font-semibold text-slate-900 rounded-2xl border border-slate-200/80 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all cursor-pointer"
            >
              <option value="" disabled>
                -- Select Department --
              </option>
              {DEPARTMENT_OPTIONS.map((dept) => (
                <option key={dept.value} value={dept.value}>
                  {dept.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Team & Responsibility (Dependent Select) */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">
            Team & Responsibility
          </label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <Award size={16} />
            </div>
            <select
              value={formData.responsibility || ""}
              onChange={handleResponsibilityChange}
              disabled={!formData.department}
              className="w-full pl-10 pr-8 py-2.5 bg-[#F8FAFC] text-xs font-semibold text-slate-900 rounded-2xl border border-slate-200/80 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
            >
              <option value="" disabled>
                {formData.department
                  ? "-- Select Responsibility --"
                  : "Select Department first"}
              </option>
              {currentResponsibilities.map((resp) => (
                <option key={resp.value} value={resp.value}>
                  {resp.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Job Title / Discipline */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700">
              Job Title / Discipline
            </label>
            <span className="text-[10px] text-slate-400 font-medium">Optional</span>
          </div>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <Briefcase size={16} />
            </div>
            <input
              type="text"
              value={formData.jobTitle}
              onChange={(e) => onChange("jobTitle", e.target.value)}
              placeholder="e.g. Software Engineer, UI Designer, QA Engineer"
              className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] text-xs font-semibold text-slate-900 rounded-2xl border border-slate-200/80 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
            />
          </div>
        </div>

        {/* Location */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">
            Location
          </label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <MapPin size={16} />
            </div>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => onChange("location", e.target.value)}
              placeholder="e.g. San Francisco, CA"
              className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] text-xs font-semibold text-slate-900 rounded-2xl border border-slate-200/80 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
            />
          </div>
        </div>

        {/* Time Zone (Spans full width) */}
        <div className="md:col-span-2 space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">
            Time Zone
          </label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <Globe size={16} />
            </div>
            <select
              value={formData.timeZone}
              onChange={(e) => onChange("timeZone", e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 bg-[#F8FAFC] text-xs font-semibold text-slate-900 rounded-2xl border border-slate-200/80 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all appearance-none cursor-pointer"
            >
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            Your notifications, calendar deadlines, and meeting schedules adapt
            to this timezone.
          </p>
        </div>

        {/* Short Bio (Full Width) */}
        <div className="md:col-span-2 space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">
            Short Bio
          </label>
          <div className="relative">
            <textarea
              rows={3}
              value={formData.bio}
              onChange={(e) => onChange("bio", e.target.value)}
              placeholder="Tell your team about your experience, focus areas, and role..."
              className="w-full px-4 py-3 bg-[#F8FAFC] text-xs font-medium text-slate-900 rounded-2xl border border-slate-200/80 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all resize-none leading-relaxed placeholder:text-slate-400"
            />
          </div>
          <div className="flex justify-between items-center text-[11px] text-slate-400">
            <span>Brief description for your team profile card.</span>
            <span>{formData.bio?.length || 0}/280</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PersonalInfoForm;
