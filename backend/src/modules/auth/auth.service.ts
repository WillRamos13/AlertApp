import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from '../../config/database';
import { env } from '../../config/env';
import { emailVerificationTokens, passwordResetTokens, roles, sessions, users } from '../../db/schema';
import { ApiError } from '../../shared/errors/ApiError';
import { hashPassword, verifyPassword } from '../../shared/security/password';
import { generateOpaqueToken, hashToken, refreshExpiresAt, signAccessToken } from '../../shared/security/tokens';
import type { AuthenticatedUser, RoleCode, UserStatus } from '../../shared/types/auth';
import { emailService } from '../../services/email.service';
import { writeAuditLog } from '../audit/audit.service';
import type { EmailInput, LoginInput, RegisterInput, ResetPasswordInput } from './auth.schemas';

interface RequestMetadata {
  ip?: string | null;
  userAgent?: string | null;
}

interface SessionResult {
  user: AuthenticatedUser;
  accessToken: string;
  refreshToken: string;
}

const selectUserFields = {
  id: users.id,
  email: users.email,
  nombres: users.nombres,
  apellidos: users.apellidos,
  passwordHash: users.passwordHash,
  status: users.estado,
  emailVerifiedAt: users.emailVerifiedAt,
  failedAttempts: users.intentosFallidos,
  blockedUntil: users.bloqueadoHasta,
  role: roles.codigo
};

interface AuthProjectionRow {
  id: string;
  email: string;
  nombres: string;
  apellidos: string;
  role: string;
  status: UserStatus;
  emailVerifiedAt: Date | null;
}

function toAuthenticatedUser(row: AuthProjectionRow): AuthenticatedUser {
  return {
    id: row.id,
    email: row.email,
    nombres: row.nombres,
    apellidos: row.apellidos,
    role: row.role as RoleCode,
    status: row.status,
    emailVerifiedAt: row.emailVerifiedAt
  };
}

async function findUserByEmail(email: string) {
  const rows = await db
    .select(selectUserFields)
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);
  return rows[0];
}

async function findUserById(id: string) {
  const rows = await db
    .select(selectUserFields)
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, id))
    .limit(1);
  return rows[0];
}

async function createVerificationToken(userId: string): Promise<string> {
  const token = generateOpaqueToken();
  await db.transaction(async (transaction) => {
    await transaction
      .update(emailVerificationTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(emailVerificationTokens.userId, userId), isNull(emailVerificationTokens.usedAt)));
    await transaction.insert(emailVerificationTokens).values({
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
  });
  return token;
}

export async function registerCitizen(input: RegisterInput, metadata: RequestMetadata) {
  const citizenRole = await db.select({ id: roles.id }).from(roles).where(eq(roles.codigo, 'CIUDADANO')).limit(1);
  if (!citizenRole[0]) {
    throw new ApiError(500, 'La configuración de roles no está inicializada.', 'ROLES_NOT_INITIALIZED');
  }
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new ApiError(409, 'Ya existe una cuenta registrada con ese correo.', 'EMAIL_ALREADY_EXISTS');
  }

  const passwordHash = await hashPassword(input.password);
  const inserted = await db
    .insert(users)
    .values({
      roleId: citizenRole[0].id,
      nombres: input.nombres,
      apellidos: input.apellidos,
      email: input.email,
      passwordHash
    })
    .returning({ id: users.id, email: users.email, nombres: users.nombres, apellidos: users.apellidos, status: users.estado, emailVerifiedAt: users.emailVerifiedAt });

  const user = { ...inserted[0], role: 'CIUDADANO' as RoleCode } as AuthenticatedUser;
  const verificationToken = await createVerificationToken(user.id);
  try {
    await emailService.sendVerificationEmail(user.email, verificationToken);
  } catch (error) {
    console.error('No se pudo enviar verificación:', error);
    throw new ApiError(503, 'La cuenta fue creada, pero no se pudo enviar la verificación. Solicita un nuevo correo.', 'EMAIL_SEND_FAILED');
  }

  await writeAuditLog({ actorUserId: user.id, accion: 'REGISTRO_CIUDADANO', entidad: 'USUARIO', entidadId: user.id, resultado: 'EXITO', ip: metadata.ip });
  return {
    user,
    ...(env.EXPOSE_DEV_TOKENS && env.NODE_ENV !== 'production' ? { devVerificationToken: verificationToken } : {})
  };
}

export async function resendVerification(input: EmailInput) {
  const user = await findUserByEmail(input.email);
  let token: string | undefined;
  if (user && !user.emailVerifiedAt && user.status === 'ACTIVO') {
    token = await createVerificationToken(user.id);
    await emailService.sendVerificationEmail(user.email, token);
  }
  return {
    message: 'Si la cuenta existe y requiere verificación, recibirás un correo.',
    ...(token && env.EXPOSE_DEV_TOKENS && env.NODE_ENV !== 'production' ? { devVerificationToken: token } : {})
  };
}

export async function verifyEmail(token: string): Promise<void> {
  const matches = await db
    .select({ id: emailVerificationTokens.id, userId: emailVerificationTokens.userId })
    .from(emailVerificationTokens)
    .where(and(eq(emailVerificationTokens.tokenHash, hashToken(token)), isNull(emailVerificationTokens.usedAt), gt(emailVerificationTokens.expiresAt, new Date())))
    .limit(1);
  const record = matches[0];
  if (!record) {
    throw new ApiError(400, 'El enlace de verificación no es válido o ha expirado.', 'INVALID_VERIFICATION_TOKEN');
  }
  await db.transaction(async (transaction) => {
    await transaction.update(emailVerificationTokens).set({ usedAt: new Date() }).where(eq(emailVerificationTokens.id, record.id));
    await transaction.update(users).set({ emailVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, record.userId));
  });
  await writeAuditLog({ actorUserId: record.userId, accion: 'EMAIL_VERIFICADO', entidad: 'USUARIO', entidadId: record.userId, resultado: 'EXITO' });
}

export async function login(input: LoginInput, metadata: RequestMetadata): Promise<SessionResult> {
  const user = await findUserByEmail(input.email);
  if (!user) {
    await writeAuditLog({ accion: 'LOGIN_FALLIDO', entidad: 'AUTH', resultado: 'ERROR', detalleSeguro: { motivo: 'credenciales_invalidas' }, ip: metadata.ip });
    throw new ApiError(401, 'Correo o contraseña incorrectos.', 'INVALID_CREDENTIALS');
  }
  if (user.status !== 'ACTIVO') {
    throw new ApiError(403, 'Tu cuenta no está activa.', 'ACCOUNT_DISABLED');
  }
  if (user.blockedUntil && user.blockedUntil > new Date()) {
    throw new ApiError(429, 'Cuenta bloqueada temporalmente por intentos fallidos.', 'ACCOUNT_TEMPORARILY_LOCKED');
  }

  const validPassword = await verifyPassword(user.passwordHash, input.password);
  if (!validPassword) {
    const failedAttempts = user.failedAttempts + 1;
    const blockedUntil = failedAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
    await db.update(users).set({ intentosFallidos: failedAttempts, bloqueadoHasta: blockedUntil, updatedAt: new Date() }).where(eq(users.id, user.id));
    await writeAuditLog({ actorUserId: user.id, accion: 'LOGIN_FALLIDO', entidad: 'AUTH', entidadId: user.id, resultado: 'ERROR', detalleSeguro: { motivo: 'credenciales_invalidas' }, ip: metadata.ip });
    throw new ApiError(401, 'Correo o contraseña incorrectos.', 'INVALID_CREDENTIALS');
  }
  if (!user.emailVerifiedAt) {
    throw new ApiError(403, 'Verifica tu correo electrónico antes de iniciar sesión.', 'EMAIL_NOT_VERIFIED');
  }

  const refreshToken = generateOpaqueToken();
  await db.transaction(async (transaction) => {
    await transaction.update(users).set({ intentosFallidos: 0, bloqueadoHasta: null, ultimoAccesoAt: new Date(), updatedAt: new Date() }).where(eq(users.id, user.id));
    await transaction.insert(sessions).values({
      userId: user.id,
      refreshTokenHash: hashToken(refreshToken),
      userAgent: metadata.userAgent?.slice(0, 255),
      ipHash: metadata.ip ? hashToken(metadata.ip) : null,
      expiresAt: refreshExpiresAt()
    });
  });
  await writeAuditLog({ actorUserId: user.id, accion: 'LOGIN_EXITOSO', entidad: 'AUTH', entidadId: user.id, resultado: 'EXITO', ip: metadata.ip });
  return { user: toAuthenticatedUser(user), accessToken: signAccessToken(user.id, user.role as RoleCode), refreshToken };
}

export async function refreshSession(refreshToken: string, metadata: RequestMetadata): Promise<SessionResult> {
  const found = await db
    .select({ sessionId: sessions.id, userId: users.id, email: users.email, nombres: users.nombres, apellidos: users.apellidos, status: users.estado, emailVerifiedAt: users.emailVerifiedAt, role: roles.codigo })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(and(eq(sessions.refreshTokenHash, hashToken(refreshToken)), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date())))
    .limit(1);
  const current = found[0];
  if (!current || current.status !== 'ACTIVO') {
    throw new ApiError(401, 'No se pudo renovar la sesión.', 'INVALID_REFRESH_TOKEN');
  }

  const nextRefreshToken = generateOpaqueToken();
  await db.update(sessions).set({ refreshTokenHash: hashToken(nextRefreshToken), expiresAt: refreshExpiresAt(), ipHash: metadata.ip ? hashToken(metadata.ip) : null, userAgent: metadata.userAgent?.slice(0, 255) }).where(eq(sessions.id, current.sessionId));
  const user: AuthenticatedUser = { id: current.userId, email: current.email, nombres: current.nombres, apellidos: current.apellidos, status: current.status, role: current.role as RoleCode, emailVerifiedAt: current.emailVerifiedAt };
  return { user, accessToken: signAccessToken(user.id, user.role), refreshToken: nextRefreshToken };
}

export async function logout(refreshToken?: string): Promise<void> {
  if (!refreshToken) return;
  await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.refreshTokenHash, hashToken(refreshToken)));
}

export async function requestPasswordReset(input: EmailInput) {
  const user = await findUserByEmail(input.email);
  let token: string | undefined;
  if (user && user.status === 'ACTIVO') {
    token = generateOpaqueToken();
    await db.transaction(async (transaction) => {
      await transaction.update(passwordResetTokens).set({ usedAt: new Date() }).where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt)));
      await transaction.insert(passwordResetTokens).values({ userId: user.id, tokenHash: hashToken(token!), expiresAt: new Date(Date.now() + 30 * 60 * 1000) });
    });
    await emailService.sendPasswordResetEmail(user.email, token);
  }
  return {
    message: 'Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.',
    ...(token && env.EXPOSE_DEV_TOKENS && env.NODE_ENV !== 'production' ? { devResetToken: token } : {})
  };
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const matches = await db
    .select({ id: passwordResetTokens.id, userId: passwordResetTokens.userId })
    .from(passwordResetTokens)
    .where(and(eq(passwordResetTokens.tokenHash, hashToken(input.token)), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, new Date())))
    .limit(1);
  const record = matches[0];
  if (!record) {
    throw new ApiError(400, 'El enlace de recuperación no es válido o ha expirado.', 'INVALID_RESET_TOKEN');
  }
  const passwordHash = await hashPassword(input.newPassword);
  await db.transaction(async (transaction) => {
    await transaction.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, record.id));
    await transaction.update(users).set({ passwordHash, intentosFallidos: 0, bloqueadoHasta: null, updatedAt: new Date() }).where(eq(users.id, record.userId));
    await transaction.update(sessions).set({ revokedAt: new Date() }).where(and(eq(sessions.userId, record.userId), isNull(sessions.revokedAt)));
  });
  await writeAuditLog({ actorUserId: record.userId, accion: 'PASSWORD_RESTABLECIDO', entidad: 'USUARIO', entidadId: record.userId, resultado: 'EXITO' });
}

export async function getAuthenticatedUser(userId: string): Promise<AuthenticatedUser> {
  const user = await findUserById(userId);
  if (!user || user.status !== 'ACTIVO') {
    throw new ApiError(404, 'Usuario no disponible.', 'USER_NOT_FOUND');
  }
  return toAuthenticatedUser(user);
}
