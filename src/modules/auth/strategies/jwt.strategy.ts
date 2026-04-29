import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    // Sesuaikan path-nya menjadi 'jwt.secret'
    const jwtSecret = configService.get<string>('jwt.secret');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret ?? 'temporary-secret-key',
    });
  }

  /**
   * Jika token valid, fungsi ini dipanggil. Payload berisi data user (id, email, role)
   * Kita hapus 'async' karena tidak ada operasi asynchronous (await) di dalamnya
   */
  validate(payload: any) {
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
