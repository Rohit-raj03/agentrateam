import {
  Code2,
  Server,
  Palette,
  Layers,
  Crown,
  Database,
  FlaskConical,
  Terminal,
  ShieldCheck,
  Briefcase,
  FileText,
  Bug,
  GitPullRequest,
  BrainCircuit,
  Sparkles,
  Hash,
} from "lucide-react";

export const ROLE_ICON_CONFIG = {
  FRONTEND:        { label: "Frontend",        icon: Code2,          color: "#0284C7" }, // Sky Blue
  BACKEND:         { label: "Backend",         icon: Server,         color: "#059669" }, // Emerald
  UI_UX:           { label: "UI/UX",           icon: Palette,        color: "#DB2777" }, // Pink
  FULL_STACK:      { label: "Full Stack",      icon: Layers,         color: "#4F46E5" }, // Indigo
  PROJECT_LEAD:    { label: "Project Lead",    icon: Crown,          color: "#D97706" }, // Amber/Gold
  DATABASE:        { label: "Database",        icon: Database,       color: "#0D9488" }, // Teal
  TESTING:         { label: "Testing",         icon: FlaskConical,   color: "#EA580C" }, // Orange
  DEVOPS:          { label: "DevOps",          icon: Terminal,       color: "#0891B2" }, // Cyan
  QA_REVIEWER:     { label: "QA Reviewer",     icon: ShieldCheck,    color: "#7C3AED" }, // Violet
  PRODUCT_MANAGER: { label: "Product Manager", icon: Briefcase,      color: "#2563EB" }, // Royal Blue
  DOCUMENTATION:   { label: "Documentation",   icon: FileText,       color: "#475569" }, // Slate
  BUG_FIX:         { label: "Bug Fix",         icon: Bug,            color: "#E11D48" }, // Rose/Red
  CONTRIBUTOR:     { label: "Contributor",     icon: GitPullRequest, color: "#16A34A" }, // Green
  AI_ML:           { label: "AI/ML",           icon: BrainCircuit,   color: "#9333EA" }, // Purple
  AI_THINK:        { label: "AI Think",        icon: Sparkles,       color: "#C026D3" }, // Fuchsia
};

export const ASSIGNED_TAGS = {
  FRONTEND: "Frontend",
  BACKEND: "Backend",
  UI_UX: "UI/UX",
  FULL_STACK: "Full Stack",
  PROJECT_LEAD: "Project Lead",
  DATABASE: "Database",
  TESTING: "Testing",
  DEVOPS: "DevOps",
  QA_REVIEWER: "QA Reviewer",
  PRODUCT_MANAGER: "Product Manager",
  DOCUMENTATION: "Documentation",
  BUG_FIX: "Bug Fix",
  CONTRIBUTOR: "Contributor",
  AI_ML: "AI/ML",
  AI_THINK: "AI Think",
};

/**
 * Resolves role icon and color using case-insensitive partial matching from ROLE_ICON_CONFIG.
 * Falls back to Hash (rgb(67, 97, 238)).
 */
export const getRoleTagConfig = (tag = "") => {
  const normalized = String(tag || "").toLowerCase().trim();

  if (!normalized) {
    return { Icon: Hash, color: "rgb(67, 97, 238)", label: "" };
  }

  // 1. Project Lead / Owner
  if (normalized.includes("owner") || normalized.includes("lead")) {
    return { Icon: ROLE_ICON_CONFIG.PROJECT_LEAD.icon, color: ROLE_ICON_CONFIG.PROJECT_LEAD.color, label: ROLE_ICON_CONFIG.PROJECT_LEAD.label };
  }

  // 2. AI Think
  if (normalized.includes("ai think") || normalized.includes("ai_think") || normalized.includes("sparkle") || normalized.includes("thinking")) {
    return { Icon: ROLE_ICON_CONFIG.AI_THINK.icon, color: ROLE_ICON_CONFIG.AI_THINK.color, label: ROLE_ICON_CONFIG.AI_THINK.label };
  }

  // 3. AI / ML
  if (normalized.includes("ai") || normalized.includes("ml") || normalized.includes("machine learning") || normalized.includes("model")) {
    return { Icon: ROLE_ICON_CONFIG.AI_ML.icon, color: ROLE_ICON_CONFIG.AI_ML.color, label: ROLE_ICON_CONFIG.AI_ML.label };
  }

  // 4. Full Stack
  if (normalized.includes("fullstack") || normalized.includes("full-stack") || normalized.includes("full stack")) {
    return { Icon: ROLE_ICON_CONFIG.FULL_STACK.icon, color: ROLE_ICON_CONFIG.FULL_STACK.color, label: ROLE_ICON_CONFIG.FULL_STACK.label };
  }

  // 5. Frontend
  if (normalized.includes("frontend") || normalized.includes("front-end")) {
    return { Icon: ROLE_ICON_CONFIG.FRONTEND.icon, color: ROLE_ICON_CONFIG.FRONTEND.color, label: ROLE_ICON_CONFIG.FRONTEND.label };
  }

  // 6. Backend
  if (normalized.includes("backend") || normalized.includes("back-end")) {
    return { Icon: ROLE_ICON_CONFIG.BACKEND.icon, color: ROLE_ICON_CONFIG.BACKEND.color, label: ROLE_ICON_CONFIG.BACKEND.label };
  }

  // 7. Database
  if (normalized.includes("database") || normalized.includes("db") || normalized.includes("sql") || normalized.includes("mongo")) {
    return { Icon: ROLE_ICON_CONFIG.DATABASE.icon, color: ROLE_ICON_CONFIG.DATABASE.color, label: ROLE_ICON_CONFIG.DATABASE.label };
  }

  // 8. UI / UX / Design
  if (normalized.includes("ui/ux") || normalized.includes("ui") || normalized.includes("ux") || normalized.includes("design") || normalized.includes("palette")) {
    return { Icon: ROLE_ICON_CONFIG.UI_UX.icon, color: ROLE_ICON_CONFIG.UI_UX.color, label: ROLE_ICON_CONFIG.UI_UX.label };
  }

  // 9. DevOps / Cloud / Terminal
  if (normalized.includes("devops") || normalized.includes("cloud") || normalized.includes("terminal") || normalized.includes("infra")) {
    return { Icon: ROLE_ICON_CONFIG.DEVOPS.icon, color: ROLE_ICON_CONFIG.DEVOPS.color, label: ROLE_ICON_CONFIG.DEVOPS.label };
  }

  // 10. QA Reviewer / Admin
  if (normalized.includes("qa") || normalized.includes("reviewer") || normalized.includes("admin") || normalized.includes("security")) {
    return { Icon: ROLE_ICON_CONFIG.QA_REVIEWER.icon, color: ROLE_ICON_CONFIG.QA_REVIEWER.color, label: ROLE_ICON_CONFIG.QA_REVIEWER.label };
  }

  // 11. Testing
  if (normalized.includes("test") || normalized.includes("testing")) {
    return { Icon: ROLE_ICON_CONFIG.TESTING.icon, color: ROLE_ICON_CONFIG.TESTING.color, label: ROLE_ICON_CONFIG.TESTING.label };
  }

  // 12. Product Manager / PM
  if (normalized.includes("product") || normalized.includes("pm") || normalized.includes("manager")) {
    return { Icon: ROLE_ICON_CONFIG.PRODUCT_MANAGER.icon, color: ROLE_ICON_CONFIG.PRODUCT_MANAGER.color, label: ROLE_ICON_CONFIG.PRODUCT_MANAGER.label };
  }

  // 13. Documentation
  if (normalized.includes("doc") || normalized.includes("documentation") || normalized.includes("writer")) {
    return { Icon: ROLE_ICON_CONFIG.DOCUMENTATION.icon, color: ROLE_ICON_CONFIG.DOCUMENTATION.color, label: ROLE_ICON_CONFIG.DOCUMENTATION.label };
  }

  // 14. Bug Fix
  if (normalized.includes("bug") || normalized.includes("fix") || normalized.includes("issue")) {
    return { Icon: ROLE_ICON_CONFIG.BUG_FIX.icon, color: ROLE_ICON_CONFIG.BUG_FIX.color, label: ROLE_ICON_CONFIG.BUG_FIX.label };
  }

  // 15. Contributor
  if (normalized.includes("contributor") || normalized.includes("member")) {
    return { Icon: ROLE_ICON_CONFIG.CONTRIBUTOR.icon, color: ROLE_ICON_CONFIG.CONTRIBUTOR.color, label: ROLE_ICON_CONFIG.CONTRIBUTOR.label };
  }

  // Direct match in ROLE_ICON_CONFIG values
  for (const config of Object.values(ROLE_ICON_CONFIG)) {
    if (config.label.toLowerCase() === normalized) {
      return { Icon: config.icon, color: config.color, label: config.label };
    }
  }

  return { Icon: Hash, color: "rgb(67, 97, 238)", label: tag };
};

// Project Theme Tag styling (Unified theme)
export const PROJECT_THEME_TAG_STYLE = "bg-indigo-50 text-primary border-indigo-100/90";

export const TAG_COLORS = {
  Frontend: PROJECT_THEME_TAG_STYLE,
  Backend: PROJECT_THEME_TAG_STYLE,
  "UI/UX": PROJECT_THEME_TAG_STYLE,
  "Full Stack": PROJECT_THEME_TAG_STYLE,
  "Project Lead": PROJECT_THEME_TAG_STYLE,
  Database: PROJECT_THEME_TAG_STYLE,
  Testing: PROJECT_THEME_TAG_STYLE,
  DevOps: PROJECT_THEME_TAG_STYLE,
  "QA Reviewer": PROJECT_THEME_TAG_STYLE,
  "Product Manager": PROJECT_THEME_TAG_STYLE,
  Documentation: PROJECT_THEME_TAG_STYLE,
  "Bug Fix": PROJECT_THEME_TAG_STYLE,
  Contributor: PROJECT_THEME_TAG_STYLE,
  "AI/ML": PROJECT_THEME_TAG_STYLE,
  "AI Think": PROJECT_THEME_TAG_STYLE,
};

export const getAssignedTagStyle = (tag) => {
  return TAG_COLORS[tag] || PROJECT_THEME_TAG_STYLE;
};

export const getAssignedTagLabel = (tag) => {
  return Object.values(ASSIGNED_TAGS).includes(tag) ? tag : tag || "Unknown";
};

export default ASSIGNED_TAGS;
