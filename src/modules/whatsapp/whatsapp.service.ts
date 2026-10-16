import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Format nomor yang diterima server WhatsApp: kode negara tanpa "+" (628xx).
export const normalizePhoneNumber = (phone: string | null | undefined) => {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `62${digits}`;
  return digits;
};

/**
 * Client HTTP ke server WhatsApp (Node.js) terpisah.
 * Tidak pernah throw: server WA mati / lambat tidak boleh mengganggu FMS.
 */
@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(private readonly config: ConfigService) {}

  get isEnabled() {
    return !!this.config.get<string>('whatsapp.apiUrl');
  }

  async send(phone: string, message: string): Promise<boolean> {
    const url = this.config.get<string>('whatsapp.apiUrl');
    const number = normalizePhoneNumber(phone);
    if (!url || !number) return false;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number, message }),
        signal: AbortSignal.timeout(
          this.config.get<number>('whatsapp.timeoutMs') ?? 10_000,
        ),
      });
      if (!res.ok) {
        this.logger.warn(
          `Kirim WA ke ${number} gagal: HTTP ${res.status} ${await res.text().catch(() => '')}`,
        );
        return false;
      }
      return true;
    } catch (e: unknown) {
      this.logger.warn(
        `Kirim WA ke ${number} gagal: ${e instanceof Error ? e.message : String(e)}`,
      );
      return false;
    }
  }
}
