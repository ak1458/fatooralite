export type Role = "owner" | "accountant" | "manager" | "auditor" | "employee";

export type Permission =
  | "invoice:create"
  | "invoice:edit"
  | "invoice:delete"
  | "invoice:clear"
  | "invoice:export"
  | "invoice:approve"
  | "audit:view"
  | "settings:manage"
  | "users:manage";

/** Role → permissions matrix (mirrors the PRD roles). */
const MATRIX: Record<Role, Permission[]> = {
  owner: [
    "invoice:create",
    "invoice:edit",
    "invoice:delete",
    "invoice:clear",
    "invoice:export",
    "invoice:approve",
    "audit:view",
    "settings:manage",
    "users:manage",
  ],
  accountant: [
    "invoice:create",
    "invoice:edit",
    "invoice:clear",
    "invoice:export",
    "invoice:approve",
    "audit:view",
  ],
  manager: ["invoice:create", "invoice:edit", "invoice:export", "audit:view"],
  auditor: ["audit:view", "invoice:export"],
  employee: ["invoice:create"],
};

export const ROLES = Object.keys(MATRIX) as Role[];

export function isRole(value: string): value is Role {
  return (ROLES as string[]).includes(value);
}

/** Whether a role has a permission. Unknown roles have none. */
export function can(role: string, permission: Permission): boolean {
  if (!isRole(role)) return false;
  return MATRIX[role].includes(permission);
}

/** The full role → permissions matrix, for the Users & Roles admin view. */
export function roleMatrix(): { role: Role; permissions: Permission[] }[] {
  return ROLES.map((role) => ({ role, permissions: MATRIX[role] }));
}

/** All permissions of a system role ([] for unknown/custom slugs). */
export function MATRIX_LOOKUP(role: string): Permission[] {
  return isRole(role) ? MATRIX[role] : [];
}

/** Every permission the platform defines (custom-role builder options). */
export const ALL_PERMISSIONS: Permission[] = [
  "invoice:create",
  "invoice:edit",
  "invoice:delete",
  "invoice:clear",
  "invoice:export",
  "invoice:approve",
  "audit:view",
  "settings:manage",
  "users:manage",
];

export function isPermission(value: string): value is Permission {
  return (ALL_PERMISSIONS as string[]).includes(value);
}
