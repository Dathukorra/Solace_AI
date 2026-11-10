# Solace AI Monorepo

A modern, production-ready full-stack monorepo featuring an **Expo React Native** mobile client and a **Node.js Express TypeScript** backend server.

---

## 📁 Monorepo Structure

```text
Solace_AI/
├── package.json               # Root monorepo workspace configuration
├── .prettierrc                # Root Prettier formatting rules
├── .gitignore                 # Root Git ignore rules
│
├── app/                       # Expo React Native App (SDK 52, TypeScript, Expo Router)
│   ├── app.json               # Expo configuration & plugins
│   ├── babel.config.js        # Babel with react-native-reanimated plugin
│   ├── tsconfig.json          # TypeScript path aliases (@/* -> ./src/*)
│   ├── .eslintrc.js           # ESLint configuration
│   ├── package.json           # App dependencies and scripts
│   └── src/
│       ├── app/               # Expo Router file-based routes
│       │   ├── _layout.tsx    # Root layout (Fonts, QueryProvider, Stack)
│       │   ├── index.tsx      # Entry redirect
│       │   ├── (auth)/        # Auth route group (login, register)
│       │   ├── (tabs)/        # Tab navigation (home, chat, mood, activities, profile)
│       │   ├── modal.tsx      # Modal sheet presentation
│       │   └── +not-found.tsx # 404 fallback screen
│       ├── components/        # Reusable UI components (Button, Card, Text, Input, Header)
│       ├── theme/             # Design tokens (colors, Nunito & Inter typography, spacing)
│       ├── api/               # API client, SecureStore token handling, TanStack Query provider
│       ├── store/             # Zustand global stores (authStore, moodStore)
│       └── features/          # Domain-driven feature modules
│           ├── auth/          # Authentication screens, hooks, and services
│           ├── home/          # Daily greeting, quick actions, and mood overview
│           ├── chat/          # Solace AI chat interface with animations
│           ├── mood/          # Mood selector, emojis, and history log
│           ├── activities/    # Mindfulness, breathing, and exercises
│           ├── reminders/     # Gentle push notifications (expo-notifications)
│           └── profile/       # Profile header and settings
│
└── server/                    # Node.js Backend (Express, TypeScript, Prisma, Zod)
    ├── tsconfig.json          # Server TypeScript config with path aliases (@/* -> ./src/*)
    ├── .env                   # Environment variables (PORT, DATABASE_URL, CORS_ORIGIN, JWT_SECRET)
    ├── .env.example           # Example environment template
    ├── package.json           # Server dependencies and scripts
    ├── prisma/
    │   └── schema.prisma      # Prisma schema (SQLite / PostgreSQL ready)
    └── src/
        ├── app.ts             # Express app setup (Helmet, CORS, Middlewares, Routes)
        ├── index.ts           # Server entry point & graceful shutdown handlers
        ├── lib/               # Shared utilities (Zod env validation, Prisma singleton, errors, logger)
        ├── middleware/        # Request logger, Zod validator, 404, global error handler
        ├── routes/            # Route declarations (/health, /api/auth, /api/mood)
        ├── controllers/       # HTTP controllers
        └── services/          # Business logic and database interactions
```

---

## ⚡ Quickstart & Exact Install Commands

### Prerequisites

- **Node.js**: v18.0.0 or later (v20+ recommended)
- **npm**: v9.0.0 or later

---

### Step 1: Install All Dependencies (Single Command)

Because the project uses npm workspaces, you can install all root, app, and server dependencies in one command from the project root:

```bash
npm install
```

> **Alternatively**, if you prefer to install packages folder-by-folder or manually:

#### In `/app`:

```bash
cd app
npm install expo@~52.0.25 react@18.3.1 react-dom@18.3.1 react-native@0.76.6 react-native-reanimated@~3.16.1 react-native-svg@15.8.0 expo-linear-gradient@~14.0.1 expo-haptics@~14.0.0 expo-notifications@~0.29.11 expo-secure-store@~14.0.0 expo-device@~7.0.1 lottie-react-native@^7.2.2 zustand@^5.0.3 @tanstack/react-query@^5.66.0 expo-font@~13.0.1 @expo-google-fonts/nunito@^0.2.3 @expo-google-fonts/inter@^0.2.3 expo-router@~4.0.15 expo-constants@~17.0.3 expo-linking@~7.0.3 expo-splash-screen@~0.29.18 expo-status-bar@~2.0.0 react-native-safe-area-context@4.12.0 react-native-screens@~4.4.0 react-native-web@~0.19.13

npm install --save-dev typescript@~5.3.3 @types/react@~18.3.12 @babel/core@^7.25.2 eslint@^8.57.1 eslint-config-expo@~8.0.1 prettier@^3.5.0
cd ..
```

#### In `/server`:

```bash
cd server
npm install express@^4.21.2 cors@^2.8.5 helmet@^8.0.0 zod@^3.24.2 @prisma/client@^6.3.1 dotenv@^16.4.7

npm install --save-dev typescript@^5.7.3 tsx@^4.19.2 prisma@^6.3.1 @types/node@^22.13.4 @types/express@^5.0.0 @types/cors@^2.8.17 eslint@^8.57.1 @typescript-eslint/parser@^8.24.0 @typescript-eslint/eslint-plugin@^8.24.0 prettier@^3.5.0
cd ..
```

---

### Step 2: Initialize Database with Prisma

Generate the Prisma Client and run PostgreSQL migrations (or push schema directly for quick prototyping):

```bash
# Generate the Prisma client
npm run prisma:generate

# Apply PostgreSQL migrations
npm run prisma:migrate

# Or push schema directly for rapid local development
npm run prisma:push

# Seed with initial mock users, conversations, memories & check-ins
npm run prisma:seed
```

---

### Step 3: Run Integration Tests

Run the full suite of Supertest integration tests for auth, rate limiting, and protected endpoints:

```bash
npm run test:server

# Or with test coverage report:
npm run test:server:coverage
```

---

### Step 3: Run the Monorepo

#### Option A: Run Both Mobile App & Server Simultaneously (Recommended)

```bash
npm run dev
```

#### Option B: Run Server Only

```bash
npm run dev:server
# Server will run on http://localhost:5000
```

#### Option C: Run App Only

```bash
npm run dev:app
# Opens Expo CLI dev menu (press 'w' for web, 'a' for android, 'i' for iOS)
```

---

## 🛠️ Server Architecture Details

- **Runtime & Language**: Node.js with TypeScript and `tsx` hot-reloading.
- **Security**: `helmet()` for secure HTTP headers, `cors()` configured with configurable origin whitelist.
- **Environment Validation**: Validated at startup with **Zod** in [server/src/lib/env.ts](file:///c:/Users/dathu/OneDrive/Desktop/Solace_AI/server/src/lib/env.ts). Server fails fast with descriptive diagnostics if required variables are missing or misconfigured.
- **Database & ORM**: **Prisma** with **PostgreSQL** (`provider = "postgresql"`). Models: `User`, `MoodCheckin`, `Conversation`, `Message`, `UserMemory`, `Activity`, `Reminder`, and `PushToken`. Includes cascade deletes and indexed queries on `userId` and `createdAt`.
- **Error Handling**: Centralized global error handler in [server/src/middleware/errorHandler.ts](file:///c:/Users/dathu/OneDrive/Desktop/Solace_AI/server/src/middleware/errorHandler.ts) handling Zod validation errors, custom `AppError` subclasses, Prisma exceptions, and uncaught 500s.
- **Health Check Route**: Direct endpoint at `/health` verifying memory, uptime, and database connectivity.

### Server Endpoints

| Method   | Endpoint                      | Auth Required | Description                                                               |
| :------- | :---------------------------- | :------------ | :------------------------------------------------------------------------ |
| `GET`    | `/health`                     | No            | Health check verifying memory, uptime & database connectivity             |
| `POST`   | `/api/auth/signup`            | No (Rate Ltd) | Signup with name, email, password, goals, timezone. Returns tokens        |
| `POST`   | `/api/auth/login`             | No (Rate Ltd) | Bcrypt login verification. Returns access (15m) & refresh (30d) JWT       |
| `POST`   | `/api/auth/refresh`           | No (Rate Ltd) | Exchange valid refresh token for a fresh 15-minute access token           |
| `GET`    | `/api/auth/me`                | Bearer Token  | Retrieve authenticated user profile (passwordHash omitted)                |
| `PATCH`  | `/api/auth/me`                | Bearer Token  | Update user profile fields (name, goals, timezone, aiMemoryEnabled)       |
| `GET`    | `/conversations`              | Bearer Token  | List conversations (preview, updatedAt, newest first, cursor pagination)  |
| `POST`   | `/conversations`              | Bearer Token  | Create new conversation with optional title and optional first message    |
| `GET`    | `/conversations/:id`          | Bearer Token  | Retrieve conversation details and all messages in chronological order     |
| `PATCH`  | `/conversations/:id`          | Bearer Token  | Rename conversation title                                                 |
| `DELETE` | `/conversations/:id`          | Bearer Token  | Delete conversation, messages, and any derived memories/summaries         |
| `POST`   | `/conversations/:id/messages` | Bearer Token  | Streams Sola AI response via SSE with context, memory, and safety         |
| `GET`    | `/memories`                   | Bearer Token  | List user's stored memories, sorted newest first                          |
| `DELETE` | `/memories/:id`               | Bearer Token  | Delete a stored user memory row                                           |
| `GET`    | `/me` (or `/api/me`)          | Bearer Token  | Retrieve authenticated user profile                                       |
| `PATCH`  | `/me` (or `/api/me`)          | Bearer Token  | Update user profile (name, goals, timezone, aiMemoryEnabled toggle)       |
| `POST`   | `/moods`                      | Bearer Token  | Single editable check-in per local day using user's timezone              |
| `GET`    | `/moods?range=7d\|30d`        | Bearer Token  | Mood history with average score and distribution                          |
| `GET`    | `/progress`                   | Bearer Token  | Streaks (mood or activity), weekly mood averages, activity counts, badges |
| `GET`    | `/home`                       | Bearer Token  | Local greeting, today's check-in, affirmation, AI suggestion, streak      |
| `POST`   | `/activities`                 | Bearer Token  | Records completed wellness activity (type, durationSec)                   |
| `GET`    | `/reminders`                  | Bearer Token  | Lists all scheduled reminders for user                                    |
| `POST`   | `/reminders`                  | Bearer Token  | Creates reminder (type, title, time HH:mm, days 0-6, enabled)             |
| `GET`    | `/reminders/:id`              | Bearer Token  | Retrieves a specific reminder                                             |
| `PATCH`  | `/reminders/:id`              | Bearer Token  | Updates reminder properties                                               |
| `DELETE` | `/reminders/:id`              | Bearer Token  | Deletes scheduled reminder                                                |
| `POST`   | `/push-tokens`                | Bearer Token  | Registers or updates Expo device push token (upsert per device)           |
| `GET`    | `/api/mood`                   | Optional      | Retrieve recent user mood check-ins                                       |
| `POST`   | `/api/mood`                   | Optional      | Create a mood check-in (1-5 score, emotions array, optional note)         |

---

## 📱 Mobile App Architecture Details

- **Framework**: Expo SDK 52 with Expo Router v4 file-based routing.
- **Typography**:
  - Rounded Display Font: `@expo-google-fonts/nunito` (Nunito Regular, Medium, SemiBold, Bold, ExtraBold)
  - Interface Font: `@expo-google-fonts/inter` (Inter Regular, Medium, SemiBold, Bold)
  - Loaded cleanly in `src/app/_layout.tsx` with `SplashScreen.preventAutoHideAsync()`.
- **State Management**: **Zustand** stores for auth (`authStore.ts`) and mood tracking (`moodStore.ts`).
- **Data Fetching & Caching**: **TanStack React Query** with `QueryProvider` and `queryClient`.
- **Haptics & Animations**: Tactile feedback with `expo-haptics` and fluid layout transitions with `react-native-reanimated`.
- **Notifications**: Local reminders and device push notifications with `expo-notifications` and `expo-device`.
- **Secure Token Storage**: JWT and session persistence using `expo-secure-store`.
- **Path Aliasing**: Clean `@/*` import paths mapping to `./src/*`.

---

## 🎨 Calm Design System (`/app/src/theme` & `/app/src/components`)

A peaceful, accessible design system tailored for mindful and emotional wellness applications.

### 1. Palette & Light Theme Tokens

- **Soft Sage Green**: Primary brand color (`#7B9E89`, `#EAF2EC` surface, `#5C7E6A` dark)
- **Warm Cream**: Calming canvas (`#FDFBF7` background, `#FAF6F0` surface, `#FFFFFF` card)
- **Dusty Lavender**: Mindful secondary (`#9C8EB9`, `#F2EEF8` surface, `#7E6F9C` dark)
- **Peach Accent**: Warm energy (`#F29E88`, `#FDF0EB` surface, `#D87D65` dark)
- **Deep Indigo-Gray**: Gentle readable contrast (`#2C3040` primary, `#5D6377` secondary, `#8F95A8` muted)

### 2. Mood Gradients

- **Mood 1 (Sad)**: Muted Blue `['#C5D6E5', '#98B3CD']`
- **Mood 2 (Low)**: Soft Slate / Periwinkle `['#C9CEE7', '#AAB1D6']`
- **Mood 3 (Neutral)**: Dusty Lavender `['#DDD5EC', '#BAACD5']`
- **Mood 4 (Good)**: Gentle Sage to Soft Peach `['#DCEAE1', '#F8DDD5']`
- **Mood 5 (Happy)**: Warm Peach `['#FDE2D9', '#F4A28C']`

### 3. Scales & Shadows

- **Typography Scale**: `display` (32px), `title` (22px), `body` (16px), `caption` (12px)
- **Spacing Scale**: `4, 8, 12, 16, 24, 32` (accessible via `spacing[16]` or `spacing.lg`)
- **Radii Scale**: `16, 24, 32` (+ `full: 9999`)
- **Soft Shadows**: Diffuse warm shadows (`sm`, `md`, `lg`, `frosted`)

### 4. Reusable Accessible Components

- **`Screen`**: Handles subtle cream gradient or mood gradients (`moodGradient={1..5}`) with safe area insets and optional scroll mode.
- **`Text`**: Typed typography variants with deep indigo-gray default and Nunito/Inter font integration.
- **`Button`**: Variants (`primary`, `soft`, `ghost`), Reanimated spring scale on press, `expo-haptics` light impact, and `>= 44px` touch target.
- **`Card`**: Frosted translucent surface with rounded corners (`16, 24, 32`) and soft shadows. Optional interactive `onPress` with press feedback.
- **`Chip`**: Interactive pill tags with Reanimated scale, `expo-haptics` light impact, and `>= 44px` touch target.
- **`Input`**: Floating label animation built with Reanimated, floating up on focus or value entry with 56px container.
- **`IconButton`**: Circular/rounded action button with Reanimated scale, light impact haptic, and guaranteed `>= 44px` touch target.
- **`Skeleton`**: Calming warm cream pulse animation for loading states.
- **`Toast`**: Slide-in animated notifications with `ToastProvider` and `useToast()` hook.
- **`Sola`**: Animated SVG mascot blob (`calm`, `happy`, `sad`, `sleepy`, `listening`, `thinking`), featuring slow breathing scale, gentle float, periodic blinking, listening tilt, and thinking pulsing dots. Accessible on splash, home, chat header, and empty states.

---

## 📋 Available Root Scripts

| Command                        | Action                                                    |
| :----------------------------- | :-------------------------------------------------------- |
| `npm run dev`                  | Starts server & Expo app concurrently                     |
| `npm run dev:app`              | Starts Expo dev server                                    |
| `npm run dev:server`           | Starts Express server in watch mode                       |
| `npm run build:server`         | Compiles TypeScript server to `server/dist`               |
| `npm run start:server`         | Runs compiled production server                           |
| `npm run prisma:generate`      | Generates Prisma client types                             |
| `npm run prisma:migrate`       | Runs Prisma database migrations                           |
| `npm run prisma:push`          | Pushes Prisma schema to database directly                 |
| `npm run prisma:seed`          | Seeds database with mock users, conversations & check-ins |
| `npm run prisma:studio`        | Opens Prisma Web Studio UI                                |
| `npm run test:server`          | Runs Jest + Supertest integration tests on backend server |
| `npm run test:server:coverage` | Runs server integration tests with coverage report        |
| `npm run lint`                 | Runs ESLint across both app and server                    |
| `npm run lint:fix`             | Automatically fixes ESLint issues                         |
| `npm run format`               | Runs Prettier formatter on all codebase files             |
