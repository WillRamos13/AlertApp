import { Resend } from 'resend';
import { env } from '../config/env';

interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html: string;
}

class EmailService {
  private readonly resend = env.MAIL_PROVIDER === 'resend' ? new Resend(env.RESEND_API_KEY) : null;

  async send(input: SendEmailInput): Promise<void> {
    if (env.MAIL_PROVIDER === 'console') {
      console.info(`[AlertApp Mail DEV] Para: ${input.to} | Asunto: ${input.subject}\n${input.text}`);
      return;
    }

    if (!this.resend) {
      throw new Error('Servicio de correo no inicializado.');
    }

    const response = await this.resend.emails.send({
      from: env.MAIL_FROM,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html
    });

    if (response.error) {
      throw new Error(`No se pudo enviar el correo: ${response.error.message}`);
    }
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const link = `${env.APP_PUBLIC_URL}/verificar-email?token=${encodeURIComponent(token)}`;
    await this.send({
      to: email,
      subject: 'Verifica tu cuenta de AlertApp',
      text: `Verifica tu cuenta de AlertApp ingresando a: ${link}. Este enlace expira en 24 horas.`,
      html: `<p>Verifica tu cuenta de <strong>AlertApp</strong>.</p><p><a href="${link}">Verificar correo</a></p><p>Este enlace expira en 24 horas.</p>`
    });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const link = `${env.APP_PUBLIC_URL}/restablecer-password?token=${encodeURIComponent(token)}`;
    await this.send({
      to: email,
      subject: 'Restablece tu contraseña de AlertApp',
      text: `Restablece tu contraseña ingresando a: ${link}. Este enlace expira en 30 minutos.`,
      html: `<p>Recibimos una solicitud para cambiar tu contraseña de <strong>AlertApp</strong>.</p><p><a href="${link}">Restablecer contraseña</a></p><p>Este enlace expira en 30 minutos.</p>`
    });
  }
}

export const emailService = new EmailService();
