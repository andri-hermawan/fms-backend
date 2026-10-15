import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class ReportMailerService {
  constructor(private readonly config: ConfigService) {}

  async send(params: {
    to: string[];
    subject: string;
    html: string;
    attachment: { filename: string; content: Buffer };
  }) {
    const host = this.config.get<string>('mail.host');
    if (!host) {
      throw new Error('SMTP belum dikonfigurasi (isi SMTP_HOST di .env)');
    }
    const user = this.config.get<string>('mail.user');
    const pass = this.config.get<string>('mail.pass');

    const transporter = nodemailer.createTransport({
      host,
      port: this.config.get<number>('mail.port'),
      secure: this.config.get<boolean>('mail.secure'),
      auth: user ? { user, pass } : undefined,
    });

    await transporter.sendMail({
      from: this.config.get<string>('mail.from') || user,
      to: params.to,
      subject: params.subject,
      html: params.html,
      attachments: [
        {
          filename: params.attachment.filename,
          content: params.attachment.content,
          contentType: 'application/pdf',
        },
      ],
    });
  }
}
