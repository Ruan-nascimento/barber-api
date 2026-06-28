# Barber Queue Backend

MVP backend for barbershop queue management built with NestJS, TypeScript, PostgreSQL, and Prisma.

## Prerequisites

- Node.js 20+
- npm
- PostgreSQL (required for future database steps; not required for the health endpoint)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Generate Prisma client:

```bash
npm run prisma:generate
```

## Development

Start the server in watch mode:

```bash
npm run start:dev
```

- API: `http://localhost:3000`
- Health: `GET http://localhost:3000/health`
- Swagger: `http://localhost:3000/docs`

## Testing

```bash
npm test
npm run test:e2e
```

## Project structure

```txt
src/
  config/       Environment validation and app configuration
  common/       Shared decorators, guards, filters, and types
  database/     Prisma module and service
  health/       Health check endpoint
  auth/         Authentication module (upcoming)
  users/        Users module (upcoming)
  shop/         Shop settings module (upcoming)
  barbers/      Barbers module (upcoming)
  queue/        Queue module (upcoming)
  realtime/     WebSocket gateway module (upcoming)
  audit/        Audit log module (upcoming)
```

## Next steps

1. Define Prisma models and run migrations
2. Implement authentication and session management
3. Add shop, barber, and queue business logic
4. Enable realtime queue updates
