import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL ?? '',
  sessionSecret: process.env.SESSION_SECRET ?? '',
  cookieName: process.env.COOKIE_NAME ?? 'barber_session',
  cookieDomain: process.env.COOKIE_DOMAIN ?? 'localhost',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
}));
