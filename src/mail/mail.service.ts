import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly resend: Resend;
  private readonly from:   string;
  private readonly logger = new Logger(MailService.name);

  constructor(private config: ConfigService) {
    this.resend = new Resend(config.getOrThrow('smtp.resendApiKey'));
    this.from   = config.get('MAIL_FROM', 'Nexus <onboarding@resend.dev>');
  }

  async sendInvite(to: string, orgName: string, inviteUrl: string): Promise<void> {
    try {
     const res =  await this.resend.emails.send({
        from:    this.from,
        to,
        subject: `You've been invited to join ${orgName} on Nexus`,
        html:    this.inviteHtml(orgName, inviteUrl),
      });
      console.log(res);
    } catch (err) {
      this.logger.error(`Failed to send invite to ${to}`, err);
      throw err;
    }
  }

  async sendOtp(to: string, code: string, agentName: string): Promise<void> {
    try {
      await this.resend.emails.send({
        from:    this.from,
        to,
        subject: `Your verification code — ${agentName}`,
        html:    this.otpHtml(code, agentName),
      });
    } catch (err) {
      this.logger.error(`Failed to send OTP to ${to}`, err);
      throw err;
    }
  }

  // ─── Templates ────────────────────────────────────────────────────────────
  // Kept inline for MVP. Move to react-email or mjml post-launch.

  private inviteHtml(orgName: string, inviteUrl: string): string {
    return `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 0">
        <h2 style="margin-top:0">You've been invited to ${orgName}</h2>
        <p>Click the button below to create your account. This link expires in <strong>72 hours</strong>.</p>
        <a href="${inviteUrl}"
           style="display:inline-block;padding:12px 24px;background:#000;color:#fff;
                  border-radius:6px;text-decoration:none;font-weight:600;margin:8px 0">
          Accept invitation
        </a>
        <p style="color:#888;font-size:12px;margin-top:32px">
          If you weren't expecting this invite, you can safely ignore it.
        </p>
      </div>
    `;
  }

  private otpHtml(code: string, agentName: string): string {
    return `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 0">
        <h2 style="margin-top:0">Your verification code</h2>
        <p>Enter this code to access <strong>${agentName}</strong>. It expires in <strong>10 minutes</strong>.</p>
        <div style="font-size:40px;font-weight:700;letter-spacing:10px;
                    margin:28px 0;color:#000">${code}</div>
        <p style="color:#888;font-size:12px">
          Didn't request this? Someone may have entered your email — you can ignore it.
        </p>
      </div>
    `;
  }
}