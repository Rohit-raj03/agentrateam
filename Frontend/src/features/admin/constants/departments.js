/**
 * Organization Department & Team Responsibilities Configuration
 * Layer: features/admin/constants/
 * Responsibility: Master taxonomy mapping departments to specific team roles and responsibilities.
 */

export const departmentResponsibilities = {
  engineering: [
    { value: "frontend", label: "Frontend Developer" },
    { value: "backend", label: "Backend Developer" },
    { value: "fullstack", label: "Full Stack Developer" },
    { value: "devops", label: "DevOps Engineer" },
    { value: "cloud", label: "Cloud Engineer" },
    { value: "aiml", label: "AI/ML Engineer" },
    { value: "qa", label: "QA Engineer" },
    { value: "uiux", label: "UI/UX Designer" },
    { value: "security", label: "Security Engineer" },
  ],

  product: [
    { value: "product-management", label: "Product Manager" },
    { value: "project-management", label: "Project Manager" },
    { value: "business-analysis", label: "Business Analyst" },
    { value: "architecture", label: "Technical Architect" },
    { value: "research", label: "Product Researcher" },
  ],

  marketing: [
    { value: "sales", label: "Sales Executive" },
    { value: "digital-marketing", label: "Digital Marketing Specialist" },
    { value: "content", label: "Content Marketer" },
    { value: "seo", label: "SEO Specialist" },
    { value: "leads", label: "Lead Generation Specialist" },
    { value: "partnerships", label: "Partnership Manager" },
    { value: "brand", label: "Brand Manager" },
  ],

  customer: [
    { value: "customer-support", label: "Customer Support Specialist" },
    { value: "customer-success", label: "Customer Success Manager" },
    { value: "technical-support", label: "Technical Support Engineer" },
    { value: "onboarding", label: "Customer Onboarding Specialist" },
    { value: "account", label: "Account Manager" },
  ],

  operations: [
    { value: "hr", label: "HR Specialist" },
    { value: "finance", label: "Finance & Accounting Specialist" },
    { value: "legal", label: "Legal & Compliance Officer" },
    { value: "administration", label: "Administrative Officer" },
    { value: "procurement", label: "Procurement Specialist" },
    { value: "it", label: "IT Support Engineer" },
  ],

  leadership: [
    { value: "executive", label: "Executive Leader" },
    { value: "strategy", label: "Business Strategist" },
    { value: "rnd", label: "R&D Engineer" },
    { value: "operations-management", label: "Operations Manager" },
  ],
};

/**
 * Filter responsibilities when department changes
 * @param {string} department
 * @returns {Array<{ value: string, label: string }>}
 */
export const getResponsibilities = (department) => {
  return departmentResponsibilities[department] || [];
};

export const DEPARTMENT_OPTIONS = [
  { value: "engineering", label: "Engineering" },
  { value: "product", label: "Product" },
  { value: "marketing", label: "Marketing" },
  { value: "customer", label: "Customer" },
  { value: "operations", label: "Operations" },
  { value: "leadership", label: "Leadership" },
];
