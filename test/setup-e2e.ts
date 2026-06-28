process.env.NODE_ENV = 'test';
process.env.PORT = '3000';
process.env.DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5432/barber_queue_test?schema=public';
process.env.SESSION_SECRET = 'test-session-secret-key';
process.env.COOKIE_NAME = 'barber_session';
process.env.COOKIE_DOMAIN = 'localhost';
process.env.FRONTEND_URL = 'http://localhost:5173';
