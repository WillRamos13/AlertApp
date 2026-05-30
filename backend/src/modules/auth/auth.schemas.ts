import { z } from 'zod';

const strongPassword = z
  .string()
  .min(12, 'La contraseña debe tener al menos 12 caracteres.')
  .max(128, 'La contraseña es demasiado larga.')
  .regex(/[a-z]/, 'Debe incluir una letra minúscula.')
  .regex(/[A-Z]/, 'Debe incluir una letra mayúscula.')
  .regex(/[0-9]/, 'Debe incluir un número.')
  .regex(/[^A-Za-z0-9]/, 'Debe incluir un símbolo.');

export const registerSchema = z.object({
  nombres: z.string().trim().min(2).max(100),
  apellidos: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(255),
  password: strongPassword
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(1).max(128)
});

export const tokenSchema = z.object({ token: z.string().min(20).max(300) });

export const emailSchema = z.object({ email: z.string().trim().toLowerCase().email().max(255) });

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(300),
  newPassword: strongPassword
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type EmailInput = z.infer<typeof emailSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
