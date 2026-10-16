import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import puppeteer from 'puppeteer';

@Injectable()
export class ReportPdfService {
  private readonly logger = new Logger(ReportPdfService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  // Render halaman print frontend -> PDF. Halaman memanggil API dengan token
  // sementara, lalu menandai `window.__REPORT_READY__ = true` saat siap dicetak.
  async render(
    printPath: string,
    params: { date: string; shift: string },
  ): Promise<Buffer> {
    const frontendUrl = this.config.get<string>('report.frontendUrl');
    if (!frontendUrl) {
      throw new Error('FRONTEND_URL belum dikonfigurasi');
    }

    const token = this.jwt.sign(
      { sub: 'report-scheduler', name: 'Report Scheduler', role: 'system' },
      { expiresIn: '10m' },
    );
    const query = new URLSearchParams({ ...params, token });
    const url = `${frontendUrl.replace(/\/$/, '')}${printPath}?${query.toString()}`;

    const browser = await puppeteer.launch({
      headless: true,
      executablePath:
        this.config.get<string>('report.chromiumPath') || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 900 });
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 60_000 });
      await page.waitForFunction('window.__REPORT_READY__ === true', {
        timeout: 60_000,
      });
      // Satu halaman panjang selebar tampilan web agar hasilnya identik dengan layar
      // (tidak dipecah per halaman A4 sehingga chart tidak terpotong).
      const height = await page.evaluate(
        () => document.documentElement.scrollHeight,
      );
      const pdf = await page.pdf({
        width: '1280px',
        height: `${height + 1}px`,
        printBackground: true,
        pageRanges: '1',
      });
      return Buffer.from(pdf);
    } catch (error) {
      this.logger.error(
        `Gagal render PDF ${printPath}: ${String(error).replace(/token=[^&\s]+/g, 'token=***')}`,
      );
      throw error;
    } finally {
      // Browser selalu ditutup agar tidak menumpuk memori di proses PM2.
      await browser.close();
    }
  }
}
