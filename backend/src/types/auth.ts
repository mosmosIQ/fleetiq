import { UserRole } from "./roles";

export interface AuthUser {
  id: string;
  tenant_id: string | null;
  role: UserRole;
  email: string;
}
