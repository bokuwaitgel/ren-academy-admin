import type { User } from "@/lib/api";

export type AppRole = User["role"];
export type CanonicalRole = "candidate" | "examiner" | "admin" | "super_admin" | "partner";

export interface RoleMeta {
  value: CanonicalRole;
  label: string;
  description: string;
}

const ROLE_META: Record<CanonicalRole, RoleMeta> = {
  admin: {
    value: "admin",
    label: "Admin",
    description:
      "Manage users, roles, and access rights; create, edit, and remove exams; review analytics; control settings, premium access, and organization links.",
  },
  super_admin: {
    value: "super_admin",
    label: "Super Admin",
    description:
      "Full platform control including admin permissions, account lifecycle, system settings, partner relationships, and premium governance.",
  },
  examiner: {
    value: "examiner",
    label: "Examiner",
    description:
      "Create and review exam content, verify quality, evaluate submissions, and support academic integrity workflows.",
  },
  candidate: {
    value: "candidate",
    label: "Candidate",
    description:
      "Take exams, view results, and manage personal learning progress within assigned access limits.",
  },
  partner: {
    value: "partner",
    label: "Partner",
    description:
      "Manage partner campaigns, code distribution, and redemption tracking for organization-level collaboration.",
  },
};

const ROLE_ORDER: CanonicalRole[] = [
  "super_admin",
  "admin",
  "examiner",
  "partner",
  "candidate",
];

export function normalizeRole(role: AppRole): CanonicalRole {
  if (role === "super-admin") return "super_admin";
  return role;
}

export function toApiRole(role: CanonicalRole): AppRole {
  return role;
}

export function getRoleMeta(role: AppRole | CanonicalRole): RoleMeta {
  const normalized = role === "super-admin" ? "super_admin" : role;
  return ROLE_META[normalized as CanonicalRole];
}

export function getRoleLabel(role: AppRole | CanonicalRole): string {
  return getRoleMeta(role).label;
}

export function getRoleDescription(role: AppRole | CanonicalRole): string {
  return getRoleMeta(role).description;
}

export function getRoleOptions(includeSuperAdmin: boolean): RoleMeta[] {
  return ROLE_ORDER.filter((role) => includeSuperAdmin || role !== "super_admin").map((role) => ROLE_META[role]);
}

export const FILTERABLE_ROLES: CanonicalRole[] = [
  "super_admin",
  "admin",
  "examiner",
  "partner",
  "candidate",
];
