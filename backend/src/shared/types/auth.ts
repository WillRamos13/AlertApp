export type RoleCode = 'CIUDADANO' | 'AGENTE' | 'ADMIN';
export type UserStatus = 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO';

export interface AuthenticatedUser {
  id: string;
  email: string;
  nombres: string;
  apellidos: string;
  role: RoleCode;
  status: UserStatus;
  emailVerifiedAt: Date | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
