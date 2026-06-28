# System Design — Barber Queue MVP Backend

You are an expert backend engineer specialized in Node.js, NestJS, TypeScript, PostgreSQL, Prisma ORM, authentication, authorization, clean architecture, REST APIs, WebSockets, and production-ready backend organization.

Your task is to help build an MVP backend for a barbershop queue management system.

Before writing any code, always generate a complete and detailed implementation plan first. Do not start coding until the implementation plan is approved.

---

## 1. Project Goal

Build an MVP backend for managing queues in a barbershop.

The system must allow:

* Users to create accounts.
* Users to stay logged in for 7 days.
* Users to enter a barber queue.
* Admins to manage the barbershop status.
* Admins to manage barbers.
* Admins to manage each barber's queue.
* Real-time queue updates without unnecessary polling.

This MVP should focus on queue management first, not advanced appointment scheduling.

---

## 2. Main Concept

The barbershop has multiple barbers.

Each barber has an independent queue.

The admin can open or close the barbershop.

The admin can also close new queue entries without removing users already waiting.

Important distinction:

```txt
Barbershop closed = nobody can join any queue.
Queue closed = nobody new can enter, but existing people remain in the queue.
Barber inactive = nobody can enter this barber's queue.
Barber queue closed = nobody can enter this specific barber's queue.
```

---

## 3. Required Tech Stack

Use the following stack:

```txt
Runtime: Node.js
Framework: NestJS
Language: TypeScript
Database: PostgreSQL
ORM: Prisma
Authentication: Session token or JWT-like opaque token
Session duration: 7 days
Validation: class-validator + class-transformer
Realtime: NestJS WebSocket Gateway
Documentation: Swagger/OpenAPI
Password hashing: bcrypt or argon2
Environment variables: @nestjs/config
```

Preferred package choices:

```txt
nestjs
@nestjs/config
@nestjs/swagger
@nestjs/websockets
@nestjs/platform-socket.io
@nestjs/throttler
prisma
@prisma/client
class-validator
class-transformer
bcrypt
cookie-parser
helmet
```

---

## 4. Access Types

The system has only two roles:

```txt
USER
ADMIN
```

### USER can:

* Register.
* Login.
* Logout.
* Stay logged in for 7 days.
* View barbershop status.
* View active barbers.
* View queue information.
* Join a barber queue.
* Leave their own active queue.
* See their current queue position.

### ADMIN can:

* Open the barbershop.
* Close the barbershop.
* Open global queue entry.
* Close global queue entry.
* Create barbers.
* Edit barbers.
* Delete barbers.
* Activate barbers.
* Deactivate barbers.
* Open a specific barber queue.
* Close a specific barber queue.
* View all queues.
* Move users up in queue.
* Move users down in queue.
* Mark a queue entry as in service.
* Complete a service.
* Remove someone from a queue.
* View audit logs.

---

## 5. Admin Creation Rule

Never allow public admin account creation.

The public register endpoint must always create users with role `USER`.

Even if the frontend sends a role field, ignore it.

Example of forbidden behavior:

```json
{
  "name": "Admin",
  "email": "admin@test.com",
  "password": "1234",
  "role": "ADMIN"
}
```

The backend must ignore `role`.

The initial admin must be created only through:

```txt
- Prisma seed script
- Manual controlled database update
- Internal protected script
```

Recommended command:

```bash
npm run seed:admin
```

---

## 6. Authentication Requirements

The backend must support:

```txt
Email + password
Google login
```

For MVP, prioritize email and password first.

### Register rules

Endpoint:

```txt
POST /auth/register
```

Rules:

```txt
- name is required
- email is required
- email must be unique
- password is required
- password must have at least 4 characters
- password must be hashed
- role must always be USER
- authProvider must be EMAIL
```

### Login rules

Endpoint:

```txt
POST /auth/login
```

Rules:

```txt
- Validate email and password.
- Create a session token.
- Store only the hash of the session token in the database.
- Session must expire in 7 days.
- Return safe user data.
```

### Session persistence

Login must persist for 7 days.

Recommended cookie config for web:

```txt
HttpOnly: true
Secure: true in production
SameSite: Lax or Strict
MaxAge: 7 days
```

If using Bearer token instead of cookie, still store session token hash in the database and enforce 7-day expiration.

### Logout

Endpoint:

```txt
POST /auth/logout
```

Rules:

```txt
- Revoke the current session.
- Clear the authentication cookie if cookies are used.
```

### Current user

Endpoint:

```txt
GET /auth/me
```

Rules:

```txt
- Return authenticated user.
- Never return passwordHash.
- Never return session token hash.
```

---

## 7. Authorization

Use role-based access control.

Required guards:

```txt
AuthGuard
RolesGuard
```

Required decorators:

```txt
@CurrentUser()
@Roles()
```

Example usage:

```ts
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
@Post()
createBarber() {}
```

Admin routes must never depend only on frontend checks.

Every admin route must be protected on the backend.

---

## 8. Core Business Rules

### Joining a queue

A user can join a queue only if:

```txt
- User is authenticated.
- Barbershop is open.
- Global queue accepting is true.
- Barber exists.
- Barber is active.
- Barber queue accepting is true.
- User is not already in an active queue.
```

Active queue statuses:

```txt
WAITING
IN_SERVICE
```

### Leaving a queue

A user can leave only their own active queue.

When a user leaves:

```txt
- Status becomes CANCELED.
- Position becomes null or inactive.
- Remaining WAITING positions are reorganized.
- Realtime event is emitted.
```

### Closing the barbershop

When the admin closes the barbershop:

```txt
- No new users can enter queues.
- Existing queue entries remain.
- Admin can still manage existing queues.
```

### Closing global queue entry

When the admin closes global queue entry:

```txt
- Barbershop may still be open.
- Existing people stay in the queue.
- No new users can enter any queue.
```

### Deactivating a barber

When a barber is deactivated:

```txt
- Nobody can join this barber's queue.
- Current queue entries are not deleted.
- Admin can still manage current entries.
```

### Closing a specific barber queue

When the admin closes a barber queue:

```txt
- Nobody new can enter that barber's queue.
- Existing queue entries remain.
```

### Completing a service

When admin completes a service:

```txt
- Queue entry status becomes COMPLETED.
- completedAt is filled.
- Position is removed from active queue.
- Waiting queue positions are reorganized.
- Realtime event is emitted.
- Audit log is created.
```

### Removing someone from the queue

When admin removes someone:

```txt
- Queue entry status becomes REMOVED.
- removedAt is filled.
- Position is removed from active queue.
- Waiting queue positions are reorganized.
- Realtime event is emitted.
- Audit log is created.
```

### Moving queue positions

When admin moves someone up:

```txt
- Swap position with the previous WAITING queue entry.
```

When admin moves someone down:

```txt
- Swap position with the next WAITING queue entry.
```

Never allow invalid movements:

```txt
- First item cannot move up.
- Last item cannot move down.
- Completed, removed, canceled, or in-service users should not be moved.
```

---

## 9. Queue Statuses

Use the following queue statuses:

```txt
WAITING
IN_SERVICE
COMPLETED
REMOVED
CANCELED
```

Definitions:

```txt
WAITING = user is waiting in line.
IN_SERVICE = user is currently being served.
COMPLETED = service was completed.
REMOVED = admin removed the user.
CANCELED = user left the queue.
```

---

## 10. Database Models

Use Prisma with PostgreSQL.

Required models:

```txt
User
Session
ShopSettings
Barber
QueueEntry
AuditLog
```

### User

Fields:

```txt
id
name
email
passwordHash
role
authProvider
createdAt
updatedAt
```

### Session

Fields:

```txt
id
userId
tokenHash
expiresAt
revokedAt
createdAt
```

### ShopSettings

Fields:

```txt
id
isOpen
isQueueAccepting
openedAt
closedAt
updatedAt
```

### Barber

Fields:

```txt
id
name
description
avatarUrl
isActive
isAcceptingQueue
averageServiceMinutes
createdAt
updatedAt
```

### QueueEntry

Fields:

```txt
id
userId
barberId
position
status
joinedAt
startedAt
completedAt
removedAt
createdAt
updatedAt
```

### AuditLog

Fields:

```txt
id
adminId
action
entity
entityId
metadata
createdAt
```

---

## 11. Suggested Prisma Schema

```prisma
enum UserRole {
  USER
  ADMIN
}

enum AuthProvider {
  EMAIL
  GOOGLE
}

enum QueueStatus {
  WAITING
  IN_SERVICE
  COMPLETED
  REMOVED
  CANCELED
}

model User {
  id           String       @id @default(uuid())
  name         String
  email        String       @unique
  passwordHash String?
  role         UserRole     @default(USER)
  authProvider AuthProvider @default(EMAIL)

  sessions     Session[]
  queueEntries QueueEntry[]

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model Session {
  id        String    @id @default(uuid())
  userId    String
  tokenHash String    @unique
  expiresAt DateTime
  revokedAt DateTime?

  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@index([userId])
  @@index([expiresAt])
}

model ShopSettings {
  id               String   @id @default(uuid())
  isOpen           Boolean  @default(false)
  isQueueAccepting Boolean  @default(false)
  openedAt         DateTime?
  closedAt         DateTime?
  updatedAt        DateTime @updatedAt
}

model Barber {
  id                    String       @id @default(uuid())
  name                  String
  description           String?
  avatarUrl             String?
  isActive              Boolean      @default(true)
  isAcceptingQueue      Boolean      @default(true)
  averageServiceMinutes Int          @default(30)

  queueEntries          QueueEntry[]

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

model QueueEntry {
  id          String      @id @default(uuid())
  userId      String
  barberId    String
  position    Int?
  status      QueueStatus @default(WAITING)

  joinedAt    DateTime    @default(now())
  startedAt   DateTime?
  completedAt DateTime?
  removedAt   DateTime?

  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  barber      Barber      @relation(fields: [barberId], references: [id], onDelete: Cascade)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId])
  @@index([barberId])
  @@index([barberId, status, position])
}

model AuditLog {
  id        String   @id @default(uuid())
  adminId   String?
  action    String
  entity    String
  entityId  String?
  metadata  Json?

  createdAt DateTime @default(now())
}
```

---

## 12. Required Folder Structure

Organize the backend like this:

```txt
src/
  main.ts
  app.module.ts

  config/
    env.schema.ts
    app.config.ts

  common/
    decorators/
      current-user.decorator.ts
      roles.decorator.ts
    guards/
      auth.guard.ts
      roles.guard.ts
    filters/
      http-exception.filter.ts
    interceptors/
      response.interceptor.ts
    types/
      authenticated-request.type.ts

  database/
    prisma.module.ts
    prisma.service.ts

  auth/
    auth.module.ts
    auth.controller.ts
    auth.service.ts
    dto/
      register.dto.ts
      login.dto.ts
      google-login.dto.ts
    repositories/
      auth.repository.ts

  users/
    users.module.ts
    users.service.ts
    users.repository.ts
    dto/
      update-user.dto.ts

  shop/
    shop.module.ts
    shop.controller.ts
    shop-admin.controller.ts
    shop.service.ts
    shop.repository.ts
    dto/
      update-shop-status.dto.ts

  barbers/
    barbers.module.ts
    barbers.controller.ts
    barbers-admin.controller.ts
    barbers.service.ts
    barbers.repository.ts
    dto/
      create-barber.dto.ts
      update-barber.dto.ts

  queue/
    queue.module.ts
    queue.controller.ts
    queue-admin.controller.ts
    queue.service.ts
    queue.repository.ts
    dto/
      join-queue.dto.ts
      move-queue-entry.dto.ts

  realtime/
    realtime.module.ts
    queue.gateway.ts
    realtime.service.ts

  audit/
    audit.module.ts
    audit.service.ts
    audit.repository.ts

  health/
    health.controller.ts
```

---

## 13. Architecture Rules

Follow these rules strictly:

```txt
Controllers must only handle HTTP input/output.
Controllers must not contain business logic.
Services must contain business rules.
Repositories must contain database access.
DTOs must validate request input.
Guards must protect authentication and authorization.
Gateways must handle WebSocket events.
Shared helpers must go inside common/.
Do not create giant files.
Do not mix unrelated responsibilities.
```

File size preference:

```txt
Avoid files larger than 150 lines.
If a service grows too much, split private logic into helpers or separate domain services.
```

---

## 14. Comment Rules

Use comments only when useful.

All comments in code must be written in English.

Good comment example:

```ts
// This transaction prevents duplicate queue positions when multiple users join at the same time.
```

Bad comment example:

```ts
// Create user
```

Avoid obvious comments.

---

## 15. API Endpoints

### Auth

```txt
POST   /auth/register
POST   /auth/login
POST   /auth/google
POST   /auth/logout
GET    /auth/me
```

### Shop

```txt
GET    /shop/status
```

### Barbers

```txt
GET    /barbers
GET    /barbers/:barberId/queue
```

### User Queue

```txt
POST   /barbers/:barberId/queue/join
DELETE /queue/me/leave
GET    /queue/me
```

### Admin Shop

```txt
PATCH /admin/shop/open
PATCH /admin/shop/close
PATCH /admin/shop/queue/open
PATCH /admin/shop/queue/close
```

### Admin Barbers

```txt
POST   /admin/barbers
PATCH  /admin/barbers/:id
DELETE /admin/barbers/:id
PATCH  /admin/barbers/:id/activate
PATCH  /admin/barbers/:id/deactivate
PATCH  /admin/barbers/:id/queue/open
PATCH  /admin/barbers/:id/queue/close
```

### Admin Queue

```txt
GET   /admin/barbers/:barberId/queue
PATCH /admin/queue/:entryId/move-up
PATCH /admin/queue/:entryId/move-down
PATCH /admin/queue/:entryId/start
PATCH /admin/queue/:entryId/complete
PATCH /admin/queue/:entryId/remove
```

### Health

```txt
GET /health
```

---

## 16. Realtime Design

Use WebSocket Gateway for real-time queue updates.

Required events:

```txt
queue.updated
queue.entry.joined
queue.entry.left
queue.entry.moved
queue.entry.started
queue.entry.completed
queue.entry.removed
barber.updated
shop.status.updated
```

Recommended rooms:

```txt
shop:public
admin:dashboard
barber:{barberId}:queue
user:{userId}
```

When queue changes, emit to:

```txt
barber:{barberId}:queue
admin:dashboard
affected user room if needed
```

Examples:

```txt
When user joins queue:
- Emit queue.entry.joined
- Emit queue.updated

When admin moves user:
- Emit queue.entry.moved
- Emit queue.updated

When service is completed:
- Emit queue.entry.completed
- Emit queue.updated
```

---

## 17. Concurrency and Transactions

Queue operations must be safe against race conditions.

Use Prisma transactions for critical operations:

```txt
- Joining queue
- Leaving queue
- Removing queue entry
- Completing queue entry
- Moving queue entry up
- Moving queue entry down
- Reordering positions
```

The join queue flow must be:

```txt
1. Start transaction.
2. Check shop status.
3. Check barber status.
4. Check if user already has active queue entry.
5. Find last active WAITING position for barber.
6. Create queue entry with position = lastPosition + 1.
7. Commit transaction.
8. Emit realtime event after commit.
```

Do not emit realtime events inside an unfinished transaction.

---

## 18. Position Reordering Rule

After any action that removes someone from the active waiting queue, reorder positions.

Only reorder entries with:

```txt
status = WAITING
same barberId
```

Positions must always become:

```txt
1, 2, 3, 4, 5...
```

No gaps.

No duplicate positions.

---

## 19. DTO Validation

Use DTOs with class-validator.

Examples of validation rules:

```txt
name: required string, min length 2
email: required email
password: required string, min length 4
description: optional string
avatarUrl: optional URL
averageServiceMinutes: optional integer, min 5
```

Global validation must be enabled in `main.ts`:

```txt
whitelist: true
forbidNonWhitelisted: true
transform: true
```

This prevents unexpected fields like `role` being accepted in public register requests.

---

## 20. Security Requirements

Apply basic security practices:

```txt
Hash all passwords.
Never return passwordHash.
Never store raw session tokens.
Use HttpOnly cookies when possible.
Use Helmet.
Use CORS properly.
Use rate limiting on auth routes.
Validate all inputs.
Protect all admin routes.
Use environment variables for secrets.
Do not hardcode secrets.
```

Recommended environment variables:

```env
NODE_ENV=
PORT=
DATABASE_URL=
SESSION_SECRET=
COOKIE_NAME=
COOKIE_DOMAIN=
FRONTEND_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

---

## 21. Audit Log

Admin actions must create audit logs.

Log actions like:

```txt
SHOP_OPENED
SHOP_CLOSED
GLOBAL_QUEUE_OPENED
GLOBAL_QUEUE_CLOSED
BARBER_CREATED
BARBER_UPDATED
BARBER_DELETED
BARBER_ACTIVATED
BARBER_DEACTIVATED
BARBER_QUEUE_OPENED
BARBER_QUEUE_CLOSED
QUEUE_ENTRY_MOVED_UP
QUEUE_ENTRY_MOVED_DOWN
QUEUE_ENTRY_STARTED
QUEUE_ENTRY_COMPLETED
QUEUE_ENTRY_REMOVED
```

Audit log metadata can store useful JSON:

```json
{
  "barberId": "uuid",
  "queueEntryId": "uuid",
  "previousPosition": 2,
  "newPosition": 1
}
```

---

## 22. MVP Features to Prioritize

Implement in this order:

```txt
1. Project setup
2. Environment config
3. Prisma setup
4. Database schema
5. User model
6. Session model
7. Register
8. Login
9. Logout
10. AuthGuard
11. RolesGuard
12. Admin seed
13. ShopSettings
14. Barber CRUD
15. Queue join
16. Queue leave
17. Admin queue management
18. Realtime events
19. Swagger docs
20. Basic tests
```

---

## 23. Implementation Plan Requirement

Before generating any code, produce a complete implementation plan.

The implementation plan must include:

```txt
1. Overview of the backend architecture.
2. Explanation of each module.
3. Database schema plan.
4. Auth/session flow.
5. Admin authorization flow.
6. Queue management flow.
7. Realtime event flow.
8. Transaction strategy.
9. Folder-by-folder implementation order.
10. Endpoint implementation order.
11. Testing plan.
12. Local setup instructions.
13. Deployment preparation.
```

After writing the plan, stop and ask for approval before coding.

Do not generate code before approval.

---

## 24. Expected Coding Style

Use clean, readable TypeScript.

Follow these rules:

```txt
Use dependency injection.
Use explicit return types where useful.
Use DTOs for request bodies.
Use repositories for Prisma calls.
Use services for business logic.
Use private methods for repeated internal logic.
Avoid duplicated logic.
Avoid magic strings when constants/enums make sense.
Use meaningful names.
Do not create messy or overly clever code.
```

Bad:

```ts
async create(data: any) {}
```

Good:

```ts
async registerUser(dto: RegisterDto): Promise<AuthResponseDto> {}
```

---

## 25. Error Handling

Use proper NestJS exceptions:

```txt
BadRequestException
UnauthorizedException
ForbiddenException
NotFoundException
ConflictException
InternalServerErrorException
```

Examples:

```txt
Email already exists -> ConflictException
Wrong credentials -> UnauthorizedException
Trying to access admin route as USER -> ForbiddenException
Barber not found -> NotFoundException
Shop closed -> BadRequestException
User already in queue -> ConflictException
```

---

## 26. Response Shape

Use consistent API responses.

Example:

```json
{
  "success": true,
  "message": "Queue joined successfully.",
  "data": {}
}
```

For errors, NestJS default error format is acceptable for MVP, but a global exception filter can be added later.

---

## 27. Testing Plan

Create at least basic tests for:

```txt
Register user
Login user
Reject invalid password
Reject duplicate email
Reject USER accessing admin route
Allow ADMIN accessing admin route
Create barber
Deactivate barber
Reject joining closed shop
Reject joining inactive barber
Join queue
Reject joining multiple queues
Leave queue
Move queue entry up
Move queue entry down
Complete service
Reorder positions after removal
```

---

## 28. Local Setup Requirements

The generated project should include instructions for:

```txt
Installing dependencies
Creating .env
Running PostgreSQL
Running Prisma migration
Running Prisma generate
Running seed admin
Starting development server
Opening Swagger docs
```

Expected commands:

```bash
npm install
npx prisma migrate dev
npx prisma generate
npm run seed:admin
npm run start:dev
```

---

## 29. Deployment Preparation

Prepare the project for deployment with:

```txt
Environment variables
Prisma migration command
Build command
Start command
CORS configuration
Cookie secure configuration
Production database URL
```

Suggested production commands:

```bash
npm run build
npx prisma migrate deploy
npm run start:prod
```

---

## 30. Final Instruction

Always prioritize:

```txt
Correct business rules
Clean architecture
Security
Maintainability
Readable code
Small files
Separated responsibilities
Useful English comments
Transaction-safe queue operations
Realtime updates without polling
```

Before implementing, generate the full implementation plan and wait for approval.
