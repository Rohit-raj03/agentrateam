import React from "react";
import { MemberSelector } from "../../../shared/components/ui/MemberSelector.jsx";

/**
 * Feature Component: ProjectMemberTagSelector
 * Layer: features/projects/components/
 * Responsibility: Multi-select role & tag assignment for project contributors.
 * Reuses the canonical shared MemberSelector component.
 */
export const ProjectMemberTagSelector = ({
  taggedMembers = [],
  onChange,
  error,
  themeColor = "#4361EE",
  ...rest
}) => {
  return (
    <MemberSelector
      value={taggedMembers}
      onChange={onChange}
      error={error}
      themeColor={themeColor}
      label="Team Members"
      countLabel="added"
      {...rest}
    />
  );
};

export { MemberSelector };
export default ProjectMemberTagSelector;
