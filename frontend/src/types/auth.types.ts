export type UserRole = "SUPER_ADMIN" | "COMPANY_ADMIN";
export interface AuthUser { id: string; tenant_id: string | null; email: string; role: UserRole; }
export interface LoginResponse { token: string; user: AuthUser; }
