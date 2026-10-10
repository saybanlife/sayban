# Sayban (سایبان) — Project Overview

> **Last updated:** October 2026
> **Repository:** `sayban` — Persian healthcare booking & admin platform (PWA)

---

## 1. Product Summary

**Sayban** (سایبان — “Canopy”) is a Persian-first web application for healthcare service discovery, appointment booking, patient management, reminders, and center/staff administration. The UI is RTL, uses Vazirmatn typography, and targets mobile-first usage with PWA support.

The codebase is built on the **Fragment + Plasmic** template pattern: visual design and most page logic live in **Plasmic Studio**, while custom behavior, API integration, and selected components are implemented in TypeScript/React code.

| Surface | Route pattern | Primary Plasmic page |
|---------|---------------|----------------------|
| Landing | `/` | `Plasmic_` |
| Consumer app | `/[page]/[[...slug]]` | `PlasmicHomepage` |
| User login (name, then existing OTP) | `/login/[[...step]]` | `Login` + `PlasmicLogin` |
| Admin panel | `/panel/[[...page]]` | `PlasmicPanel` |
| Payment | `/pay` | `PlasmicPay` |
| 404 | `/404` | `Plasmic_404` |
| Plasmic canvas host | `/plasmic-host` | Design-time only |

**Backend API base:** `https://sayban.darkube.ir/webhook/`  
**Deployment target:** Docker on Darkube/Hamravesh (port 3000)

---

## 2. Technology Stack

| Layer | Technology | Version / Notes |
|-------|-----------|-----------------|
| Framework | **Next.js** (Pages Router) | 14.2.3 |
| UI library | **React** | 18 |
| Language | **TypeScript** | 5.x, strict mode |
| Visual builder | **Plasmic** | `@plasmicapp/react-web`, `@plasmicapp/cli` |
| Component libraries | Ant Design 5, Radix UI, React Aria | Via Plasmic packages |
| Styling | **CSS Modules** (Plasmic), **Tailwind CSS**, embedded CSS | Hybrid |
| HTTP client | **Axios** | 1.7.x |
| Data fetching (Plasmic) | SWR via `PlasmicQueryDataProvider` | 2.x |
| Charts | Recharts | Admin dashboards |
| Maps | Leaflet + react-leaflet | Location features |
| Dates | jalaali-js, jalali-moment, react-multi-date-picker | Persian calendar |
| Toasts | react-hot-toast | Via Fragment global action |
| Feature flags | GrowthBook | `@growthbook/growthbook-react` |
| Push notifications | Firebase Cloud Messaging | `src/lib/fcm.ts` |
| PWA | next-pwa | Disabled in development |
| Container | Node 18 Alpine | `Dockerfile` |

---

## 3. Top-Level Directory Structure

```
sayban/
├── components/              # Plasmic-owned component wrappers + custom code
│   ├── *.tsx                # Editable wrapper components (~204 files)
│   ├── forgotPassword.tsx   # Custom auth component (code-only)
│   ├── forgotPassword.module.css
│   └── plasmic/             # Auto-generated Plasmic output
│       ├── sayban/            # Main project (211 TSX + 208 CSS modules)
│       ├── antd_5_hostless/
│       ├── library_tabler_3_2_icons/
│       ├── library_tailwind_3_4_*/
│       ├── react_aria/
│       ├── radix_ui/
│       └── …                  # Other Plasmic library projects
├── src/
│   ├── pages/               # Next.js routes (8 page files)
│   ├── fragment/            # Fragment global context + code components
│   ├── components/          # shadcn-style UI + custom Plasmic registrations
│   ├── lib/                 # Firebase, FCM, utilities
│   └── styles/              # Global Tailwind + date-picker CSS
├── public/
│   ├── manifest.json        # PWA manifest (Persian name: سایبان)
│   ├── firebase-messaging-sw.js
│   └── plasmic/sayban/images/
├── docs/                    # Project documentation (this file)
├── plasmic.json             # Plasmic sync configuration (~31K lines)
├── plasmic.lock
├── next.config.js           # PWA wrapper, trailingSlash: true
├── tailwind.config.ts
├── tsconfig.json            # Path alias: @/* → src/*
├── Dockerfile
└── package.json
```

---

## 4. Architecture Overview

### 4.1 Plasmic + Next.js Pattern

The project follows Plasmic’s **“blackbox” scheme**:

1. **`components/plasmic/sayban/Plasmic*.tsx`** — Auto-generated render code (do not edit manually; re-sync from Plasmic Studio).
2. **`components/*.tsx`** — Thin, developer-owned wrappers that import and re-export Plasmic components. These are the correct place to add hooks, state, and overrides.
3. **`src/pages/*.tsx`** — Next.js route entry points that wrap Plasmic page components with required providers.

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js Page (src/pages/...)                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ GlobalContextsProvider (Fragment, GrowthBook, Splunk) │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │ PlasmicQueryDataProvider                        │  │  │
│  │  │  ┌───────────────────────────────────────────┐  │  │  │
│  │  │  │ PageParamsProvider (route, params, query) │  │  │  │
│  │  │  │  ┌─────────────────────────────────────┐  │  │  │  │
│  │  │  │  │ StyleTokensProvider                 │  │  │  │  │
│  │  │  │  │  PlasmicPage / PlasmicComponent     │  │  │  │  │
│  │  │  │  └─────────────────────────────────────┘  │  │  │  │
│  │  │  └───────────────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Application Bootstrap (`src/pages/_app.tsx`)

- Wraps all pages in `PlasmicRootProvider` (enables Plasmic head management).
- Imports global CSS: Plasmic project CSS, Tailwind globals, date-picker styles.
- Configures PWA meta tags and manifest link.
- Handles **FCM notification permission prompt** on `/home/` via `NotificationModal`.

### 4.3 Global Contexts (`PlasmicGlobalContextsProvider`)

Nested providers applied on every Plasmic page:

| Provider | Purpose |
|----------|---------|
| `EmbedCss` | Applies the global Vazirmatn `font-family`, global RTL (`direction: rtl`), mobile layout helpers, Ant Design overrides, shimmer/OTP/video-player styles |
| `AntdConfigProvider` | Ant Design 5 theme (base color `#F5F1E3`, border radius 6) |
| `Fragment` | API requests, toasts, cookies, notification modal |
| `GrowthBook` | Feature flags / A/B experiments |
| `Splunk` | Analytics integration |

---

## 5. Routing & Page Flows

### 5.1 Consumer App — `PlasmicHomepage`

**Route:** `/[page]/[[...slug]]`  
**File:** `src/pages/[page]/[[...slug]].tsx`

The homepage is a **single-page shell** that switches content via Plasmic variants rather than separate Next.js routes.

**`page` variant values:**

| Variant | Typical URL segment | Feature area |
|---------|---------------------|--------------|
| *(default/home)* | `/home/` | Main feed |
| `categories` | `/categories/` | Service categories |
| `subcategories` | `/subcategories/` | Sub-category browse |
| `center` | `/center/` | Healthcare center detail |
| `staff` | `/staff/` | Staff/practitioner profile |
| `booking` | `/booking/` | Appointment booking flow |
| `payment` | `/payment/` | Checkout |
| `patient` | `/patient/` | Patient list |
| `addPatient` | `/addPatient/` | Add patient |
| `reminderSetting` | `/reminderSetting/` | Reminder configuration |
| `reminder` (homePage2) | `/reminder/` | Reminder list (MainLiad) |
| — | `/reminder/reminder_{id}` | Reminder detail (Homepage early-return, same pattern as `reservation_{id}`) |
| `address` / `addAddress` | `/address/` | Address management |
| `editUser` | `/editUser/` | Profile editing |
| `notif` | `/notif/` | Notifications |
| `offers` | `/offers/` | Center offers |
| `about`, `faq`, `rules` | Static content pages |
| `bookNurse` | Nurse booking |

**`homePage2` variant:** Bottom navigation tabs — `home`, `reminder`, `user`, `booking`.

### 5.2 Admin Panel — `PlasmicPanel`

**Route:** `/panel/[[...page]]`  
**File:** `src/pages/panel/[[...page]].tsx`

Role-based admin dashboard for center operators and super admins:

- Authenticates via `panelToken` cookie.
- Fetches user profile from `/panel/user/profile`.
- Renders `PanelMenu` with permission-filtered menu items (dashboard, users, centers, reservations, services, staff, reports, etc.).
- **Login/create account:** When URL segment is `login` or `create`, renders `LoginPanel` instead of the dashboard.
- **Theme:** TopPage dark-mode switch (`PanelDarkModeSwitch`) persists `sayban-panel-theme` and remaps Plasmic tokens via `src/styles/panel-theme.css` (wide shell only). Responsive drawer sidebar on small screens (`PanelMobileNavButton`).

**Login panel sub-flow** (`LoginPanel.tsx`):

| View | Trigger | Component |
|------|---------|-----------|
| Login | Default / `/panel/login` | `Login2` (Plasmic) |
| Create account | `/panel/create` or register link | `CreateAccont` (wrapper + optional `CenterRegisterStep2`) |
| Forgot password | «رمز را فراموش کرده‌اید؟» link | `forgotPassword.tsx` (custom) |
| Center registration review | `/panel/center_info-{id}` (Super Admin) | `CenterRegistrationReview` |

**Panel action buttons:** `Button` / `Button2` auto-enter `loading` (and disabled) while an async `onClick` promise is in flight. Hand-owned forms also use `disabled` + busy labels.

**Date / time on panel:** `TimeInput` / `DateInput` wrappers use non-wheel Jalali/hour selects (`DateField` / `TimeField`) instead of rmc-picker dialogs. `TimeWeek` hours editors inherit this.

### 5.3 User Login — `Login` / `PlasmicLogin`

**Route:** `/login/[[...step]]` (wrapper: `components/Login.tsx`)  
Public end-user auth (distinct from panel admin login).

Bare `/login` no longer asks for a name. Outside the native app it auto-creates a guest via `POST users/guest` with default name **«کاربر مهمان»**, stores `data.token` in the public `token` cookie, and enters `/home`. Inside the Sayban Android WebView (`isSaybanNativeAndroid`) it redirects to `/login/mobile` with no auto-guest.

OTP itself is unchanged: `mobile` → `code` (`POST users/auth`, `POST /users/validate`, cookie `token`) → slim `name` profile for `type: "install"` (skipped when upgrading a guest — name is applied automatically). Missing or invalid `token` cookies cannot open `/home`; the user is sent to bare `/login` (auto-guest or mobile, as above). Guest JWT may browse; reservation and other phone-gated actions open an in-app OTP dialog (`PhoneVerifyDialog`) that reuses the same auth/validate APIs. Guests also see **«ساخت حساب کاربری»** on the profile page (instead of logout), which opens `/login/mobile`. After OTP, guest data is linked via `setProfile` + `POST users/guest/retire`, then `/getProfile` refresh. Non-guest logout is unchanged (`logoutPublic`).

### 5.4 Other Routes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | `Plasmic_` | Marketing / entry landing |
| `/pay` | `PlasmicPay` | Payment result / gateway |
| `/plasmic-host` | `PlasmicCanvasHost` | Plasmic Studio live preview; registers code components |
| `/404` | `Plasmic_404` | Not found |

---

## 6. Component Architecture

### 6.1 Wrapper vs Generated Code

**Rule of thumb:**

- Edit **`components/MyComponent.tsx`** — safe, version-controlled customizations.
- Avoid editing **`components/plasmic/sayban/PlasmicMyComponent.tsx`** — overwritten on Plasmic sync.

**Typical wrapper (minimal):**

```tsx
// components/Login2.tsx
import { PlasmicLogin2, DefaultLogin2Props } from "./plasmic/sayban/PlasmicLogin2";

export interface Login2Props extends DefaultLogin2Props {}

function Login2_(props: Login2Props, ref) {
  return <PlasmicLogin2 root={{ ref }} {...props} />;
}
export default React.forwardRef(Login2_);
```

**Extended wrapper (custom logic via overrides):**

```tsx
// components/LoginPanel.tsx — manages authView state, wires forgot-password flow
return (
  <PlasmicLoginPanel
    page={panelPage}
    overrides={mergedOverrides}
    {...restProps}
  />
);
```

### 6.2 Component Categories

| Category | Location | Examples |
|----------|----------|----------|
| **Design system primitives** | `components/` + Plasmic | `Button`, `TextInput`, `Checkbox`, `Modal`, `Select` |
| **Feature screens** | `components/` + Plasmic | `Home`, `Center`, `Booking`, `Staff`, `Payment` |
| **Admin modules** | `components/` + Plasmic | `MainPageUser`, `CenterPage`, `Dashbord`, `EditStaffs` |
| **Custom code-only** | `components/` or `src/` | `forgotPassword.tsx`, `NotificationModal` |
| **Fragment code components** | `src/fragment/components/` | `DatePicker`, `TimePicker`, `Chart`, `ApiRequest` |
| **Registered for Plasmic Studio** | `src/pages/plasmic-host.tsx` | All above + `SwiperSlider`, `JalaliMoment`, etc. |

### 6.3 Plasmic Overrides

Developers can customize Plasmic components without editing generated files:

```tsx
<PlasmicLoginPanel
  overrides={{
    loginLogin: {
      button2: { onClick: () => setAuthView("forgot") },
      style: { display: showForgot ? "none" : undefined },
    },
    reveal: {
      render: (props, RevealComponent) => (
        <>
          <RevealComponent {...props} />
          {showForgot && <ForgotPassword onBackToLogin={goToLogin} />}
        </>
      ),
    },
  }}
/>
```

---

## 7. Styling Methods

The project uses **four overlapping styling systems**:

### 7.1 Plasmic CSS Modules (Primary)

- Each Plasmic component has a co-located `Plasmic*.module.css`.
- Uses Plasmic **design tokens** as CSS variables, e.g.:
  - `var(--token-CoQ7kPLW8rRe)` — card background
  - `var(--token-ee2TuxDknsJj)` — accent/link color
  - `var(--plasmic-token-primary-green)` — brand green
- Global project styles in `components/plasmic/sayban/plasmic.css`.
- Style tokens provider: `PlasmicStyleTokensProvider.tsx`.

### 7.2 Embedded CSS (EmbedCss)

Large block of global CSS injected via `PlasmicGlobalContextsProvider`:

- Global Vazirmatn `font-family` (the `@font-face` rules live in `src/styles/globals.css`)
- Global `direction: rtl`
- Mobile viewport constraint (`max-width: 500px` on desktop)
- Bottom navigation animations (`.phone`, `.buttons`, `.circle`)
- OTP input styling, shimmer loaders, video player, Ant Design table/pagination RTL fixes

### 7.3 Tailwind CSS

- Config: `tailwind.config.ts` (shadcn-style HSL CSS variables).
- Used primarily in `src/components/ui/*` and `src/fragment/components/*`.
- Utilities: `clsx`, `tailwind-merge` via `src/lib/utils.ts`.
- Plugin: `tailwindcss-animate`.

### 7.4 Ant Design 5

- Themed via `AntdConfigProvider` in global contexts.
- Pro Components (`@ant-design/pro-components`) for admin tables and forms.
- Additional Ant overrides in embedded CSS (pagination flip, table cell alignment).

### 7.5 Custom CSS Modules (Code-Only Components)

Example: `forgotPassword.module.css` mirrors `PlasmicLogin2.module.css` structure and reuses Plasmic design tokens for visual consistency.

---

## 8. API & Data Layer

Customer reservation details + lifecycle status actions use n8n webhooks on `API_BASE_URL`: `GET reservations/details?id=` and `POST reservations/lifecycle` (jwtAuth, workflow `reservations`). The UI resolves these via `PUBLIC_ROUTES.reservationDetails` / `reservationLifecycle` and `resolveApiUrl` — not same-origin `/api/reservations/:id` (that Next BFF remains for local/test compatibility but is not deployed on `sayban.darkube.ir`). Additive nurse interview, trial, contract, and cancellation-policy data lives in `reservations__lifecycle`; forward and rollback migrations are in `scripts/sql/reservation_lifecycle.sql` and `scripts/sql/reservation_lifecycle_rollback.sql`. Center admins propose multiple interview slots via `GET/POST /api/panel/interview-slots` (stored on `centers__offers.proposed_slots` and mirrored to `reservations__lifecycle.interview_options`); the public details page lets the user pick one slot + mode (`select_interview`).

Reservation detail flow is data-driven: `service_code=VISIT` uses the three-step visit flow; a home reservation with no `service_id` is the nurse staffing/collaboration flow created by `/reservations/steff2`; reservations with a real `service_id` are one-time service bookings even when their location is `home`.

Visit booking keeps the legacy single-day `GET /service/working/` contract for normal date changes. The «first available appointment» action uses the additive `GET /service/working/range/` endpoint (`date_from`, `date_to`, plus the existing service/center identifiers), which returns all grouped daily slots in one response so the client performs one ordered in-memory search instead of one request per day. The endpoint is managed by `scripts/patch-n8n-service-working-range.mjs` and supports `--revert`.

### 8.1 Fragment Global Actions

Defined in `src/fragment/fragment.tsx` and exposed to all Plasmic interactions as `$globalActions["Fragment.*"]`:

| Action | Description |
|--------|-------------|
| `apiRequest(method, url, params?, body?, config?)` | HTTP via Axios; relative URLs prefixed with `BASE_URL` |
| `showToast(type, message, placement?, duration?)` | react-hot-toast wrapper |
| `setCookie(name, value, days?)` | Sets cookie on `.darkube.ir` domain |
| `getCookie(name)` | Reads document cookie |
| `wait(ms)` | Promise-based delay |
| `openNotificationModal()` | Opens FCM permission modal |

**Base URL:** `https://sayban.darkube.ir/webhook/`

Example paths used in Plasmic-generated code:

- `POST /panel/user/login` — Admin panel login
- `GET /panel/user/profile` — Admin profile + role
- `POST /forgot-password` — Password reset (custom component uses full URL)

**Reminders (لیاد)** — greenfield on Sayban DB + n8n workflow `reminders` (see `scripts/sql/README_reminders.md`). Canonical paths live in `PUBLIC_ROUTES` (`reminders`, `wallet`, aliases `user/task/*`). Client calls resolve via `resolveClientApiUrl` onto `API_BASE_URL` (legacy `n8n.staas.ir` reminder URLs are rewritten). Channels: `notification` / `sms` / `bale`. Times are `Asia/Tehran`; materialize horizon 30 days.

**Service-form question categories** — `centers__question_categories` stores category title, description, and display order; the nullable `centers__question.category_id` keeps all legacy questions valid as uncategorized rows. The active n8n `panel-question` workflow preserves the flat `GET /panel/question` contract and adds category metadata plus category CRUD at `/panel/question/categories*`. Forward/rollback migrations are `scripts/sql/question_categories.sql` and `scripts/sql/question_categories_rollback.sql`.

Question rendering remains driven by each row's `type`. In addition to legacy text/date/time/address/checkbox inputs, `single_choice`, `multiple_choice`, and `number` use developer-owned renderers in `AnswersUser`; numeric bounds/step and choice options remain serialized in the existing `options` column, so saved questionnaire JSON stays backward compatible.

### 8.2 ApiRequest Plasmic Component

`src/fragment/components/api-request.tsx` — Declarative data-fetch wrapper used extensively in Plasmic pages (profile loading, lists, etc.).

### 8.3 Authentication Tokens

| Context | Cookie name | Usage |
|---------|-------------|-------|
| Admin panel | `panelToken` | Set on successful `Login2` login; checked in `PlasmicPanel` |
| End user | `token` | Used by FCM registration (`src/lib/fcm.ts`) |

---

## 9. Internationalization & RTL

- **Primary language:** Persian (فارسی) — all user-facing Plasmic text is Persian.
- **Direction:** Global RTL via EmbedCss (`* { direction: rtl }`).
- **Font:** Vazirmatn (weights 100–900), self-hosted from `public/font`. It is the only
  font in the app; run `node scripts/unify-fonts.mjs` after a Plasmic sync to strip the
  Roboto/Inter/Inconsolata defaults Plasmic regenerates.
- **Calendar:** Jalali (Persian) date pickers via `jalaali-js`, `JalaliMoment`, `DatePickers`.
- **Exceptions:** OTP inputs and time pickers use `direction: ltr` where needed for numeric entry.

---

## 10. PWA & Push Notifications

### 10.1 PWA Configuration

- `next-pwa` wraps Next.js config; **disabled in development**.
- `public/manifest.json` — standalone display, theme `#6F8A3A`, Persian app name.
- Service worker output to `public/` on build.

### 10.2 Firebase Cloud Messaging

| File | Role |
|------|------|
| `src/lib/firebase.ts` | Firebase app initialization |
| `src/lib/fcm.ts` | Token registration, permission request, server sync |
| `public/firebase-messaging-sw.js` | Background message handler |

FCM token sent to: `POST https://sayban.darkube.ir/webhook/setFcmToken` (public `token` cookie)
Panel staff FCM: `POST .../webhook/panel/setFcmToken` (Bearer `panelToken` → `panel__users.fcmToken`)

Permission prompt shown on `/home/` after 2s delay (if not snoozed in localStorage).

---

## 11. Feature Flags & Analytics

| Service | File | Integration |
|---------|------|-------------|
| **GrowthBook** | `src/fragment/growthbook.tsx` | Feature flags, A/B tests; exposes `$globalActions["GrowthBook.*"]` |
| **Splunk** | `src/fragment/splunk.tsx` | Analytics global context |

Both registered in `src/pages/plasmic-host.tsx` for Plasmic Studio access.

---

## 12. Plasmic Code Component Registry

`src/pages/plasmic-host.tsx` registers custom components for use in Plasmic Studio:

**Global contexts:** Fragment, GrowthBook, Splunk

**Code components:**

| Component | Import path | Purpose |
|-----------|-------------|---------|
| DatePicker | `@/fragment/components/date-picker` | Persian date selection |
| TimePicker | `@/fragment/components/time-picker` | Time selection |
| DatePickers | `@/components/DatePickers` | Multi-date picker |
| TimePickerCustom | `@/components/TimePickerCustom` | Custom time UI |
| JalaliMoment | `@/components/JalaliMoment` | Jalali date formatting |
| SwiperSlider | `@/components/SwiperSlider` | Carousel |
| TextCollapse | `@/components/TextCollapse` | Expandable text |
| Chart | `@/fragment/components/chart` | Recharts wrapper |
| ApiRequest | `@/fragment/components/api-request` | Data fetching |
| Input, Select, Switch, Slider, Popover, Textarea | `@/fragment/components/*` | Form primitives |

---

## 13. Plasmic Library Dependencies

The `components/plasmic/` directory includes these imported Plasmic library projects:

| Library folder | Purpose |
|----------------|---------|
| `sayban` | Main application project |
| `antd_5_hostless` | Ant Design 5 components |
| `react_aria` | Accessible UI primitives |
| `radix_ui` | Radix UI wrappers |
| `library_tabler_3_2_icons` | Tabler icon set (~thousands of icons) |
| `library_tailwind_3_4_color_tokens` | Tailwind color tokens |
| `library_tailwind_3_4_number_tokens` | Tailwind spacing/size tokens |
| `react_awesome_reveal` | Scroll reveal animations |
| `react_quill` | Rich text editor |
| `lottie_react` | Lottie animations |
| `plasmic_basic_components` | Basic layout elements |
| `plasmic_rich_components` | Tables, data display |
| `plasmic_embed_css` | CSS injection |
| `vanilla_cookieconsent` | Cookie consent banner |
| `copy_to_clipboard` | Clipboard utility |
| `md_5` | MD5 hashing |

Configuration and sync state: `plasmic.json`, `plasmic.lock`.

---

## 14. Development Workflow

### 14.1 Scripts

```bash
npm run dev      # Next.js dev server
npm run build    # Production build (includes PWA service worker)
npm run start    # Production server (port 3000)
npm run lint     # ESLint (ignored during builds per next.config.js)
```

### 14.2 Path Aliases

```json
// tsconfig.json
"@/*" → "./src/*"
```

Plasmic components import from relative `components/` paths; Fragment code uses `@/` alias.

### 14.3 Plasmic Sync Workflow

1. Design in **Plasmic Studio** (project: `sayban`, ID: `qARqpE4p5tZmJuNxFbTaPz`).
2. Sync via Plasmic CLI (`plasmic sync`) — regenerates `components/plasmic/sayban/Plasmic*.tsx`.
3. Add custom behavior in corresponding `components/*.tsx` wrappers.
4. Preview live at `/plasmic-host` (canvas host endpoint).

### 14.4 Where to Put Custom Code

| Need | Location |
|------|----------|
| Page-level providers | `src/pages/*.tsx` |
| Reusable custom component | `components/MyFeature.tsx` + optional `.module.css` |
| Plasmic-registered code component | `src/fragment/components/` or `src/components/` + register in `plasmic-host.tsx` |
| Global API/toast/cookie utilities | `src/fragment/fragment.tsx` |
| App-wide side effects | `src/pages/_app.tsx` |

---

## 15. Deployment

### 15.1 Docker

```dockerfile
FROM node:18-alpine
# npm install --force → npm run build → npm start
EXPOSE 3000
```

### 15.2 Next.js Config Notes

- `trailingSlash: true` — all routes end with `/`
- `eslint.ignoreDuringBuilds: true`
- PWA service worker generated to `public/` in production

### 15.3 Hosting

Deployed on **Darkube** (Hamravesh) per README deployment guide. Custom domain configured in Plasmic as `[domain]/plasmic-host`.

---

## 16. Key Technical Notes & Conventions

### 16.1 Do Not Edit

- `components/plasmic/**/Plasmic*.tsx` (auto-generated)
- `components/plasmic/**/Plasmic*.module.css` (auto-generated, except when matching custom components)
- `plasmic.lock` (managed by CLI)

### 16.2 State Management

- **Plasmic `$state` / `useDollarState`** — Primary state inside generated components.
- **React `useState` in wrappers** — For logic outside Plasmic’s state graph (e.g., `LoginPanel` auth view switching).
- **URL-driven variants** — Page variants often derived from `$ctx.params` via `PageParamsProvider`.

### 16.3 Error Handling in API Calls

Plasmic-generated handlers typically:

1. Call `$globalActions["Fragment.apiRequest"]`.
2. Check `response.data.success`.
3. Show toast with `response.data.message`.
4. Navigate or update `$state` on success.

Custom components (e.g., `forgotPassword.tsx`) follow the same toast pattern via `useGlobalActions()`.

### 16.4 Mobile-First Layout

- EmbedCss constrains main content to **500px max-width** on desktop (simulates phone frame).
- Bottom tab navigation with animated active indicator.
- Responsive breakpoints in CSS modules use `@media (max-width: 768px)`.

### 16.5 Typing

- Plasmic generated files use `@ts-nocheck`.
- Custom wrappers use strict TypeScript.
- `Default*Props` types exported from Plasmic modules for wrapper extension.

---

## 17. Domain Feature Map (Component → Feature)

| Domain | Key components |
|--------|----------------|
| **Home & discovery** | `Home`, `Main`, `Categories`, `Subcategories`, `Search`, `Center` |
| **Booking** | `Booking`, `ReservationItem`, `Calendar`, `TimeWeek`, `Staff` |
| **Patient management** | `Patient`, `AddPatient`, `EditUser` |
| **Reminders** | `Reminder`, `ReminderSetting`, `ProcessReminders`, `PreReminderSelect` |
| **Payments** | `Payment`, `PayResult`, `Pay` |
| **Addresses & maps** | `Address`, `AddAddress`, `Loaction2`, `LoactionUser` |
| **Admin — users** | `MainPageUser`, `EditUser`, `UserMain` |
| **Admin — centers** | `CenterPage`, `Center2`, `CenterInfo`, `MainPageCenter` |
| **Admin — staff** | `EditStaffs`, `Staff`, `MainPageStaffs`, `ItemStaffs` |
| **Admin — services** | `AddServise`, `MainPageServise`, `ServicePage` |
| **Admin — tags** | `MainPageTags` (`/panel/tags/` → list/add/delete via `/panel/tags*`) |
| **Admin — notifications** | `MainPageNotifications` (`/panel/notifications` → `panel__notification`); TopPage bell |
| **Admin — reservations** | `MainPageReservations`, `ReservationItem`, `Dashbord` |
| **Admin — auth** | `LoginPanel`, `Login2`, `CreateAccont`, `forgotPassword` |
| **Content** | `About`, `Rules`, `FaQs`, `Liad` |
| **Notifications** | `NotifBox`, `SendNotif`, `NotificationModal` |

---

## 18. Environment & External Services

| Service | URL / identifier |
|---------|------------------|
| API webhooks | `https://sayban.darkube.ir/webhook/` |
| Font CDN | `https://web.sayban.app/font/` |
| Cookie domain | `.darkube.ir` |
| FCM registration | `POST .../webhook/setFcmToken` |
| Forgot password | `POST .../webhook/forgot-password` |
| PWA theme color | `#6F8A3A` |
| Plasmic project ID | `qARqpE4p5tZmJuNxFbTaPz` |

---

## 19. Related Files Quick Reference

| Concern | File(s) |
|---------|---------|
| App entry | `src/pages/_app.tsx` |
| API & toasts | `src/fragment/fragment.tsx` |
| Plasmic host / registrations | `src/pages/plasmic-host.tsx` |
| Global providers | `components/plasmic/sayban/PlasmicGlobalContextsProvider.tsx` |
| Consumer app shell | `components/plasmic/sayban/PlasmicHomepage.tsx` |
| Admin panel shell | `components/plasmic/sayban/PlasmicPanel.tsx` |
| Admin login wrapper | `components/LoginPanel.tsx` |
| Forgot password | `components/forgotPassword.tsx` |
| FCM | `src/lib/fcm.ts` |
| Tailwind globals | `src/styles/globals.css` |
| Plasmic config | `plasmic.json` |
| Docker build | `Dockerfile` |

---

## 20. Future Documentation Suggestions

Consider adding focused docs as the project grows:

- `docs/api-endpoints.md` — Webhook catalog with request/response shapes
- `docs/plasmic-workflow.md` — Sync, overrides, and code component authoring
- `docs/auth-flows.md` — Panel vs user login, cookies, roles
- `docs/deployment.md` — Darkube/Hamravesh step-by-step (extend README)

---

*This document was generated from static analysis of the repository structure and source code. Update it when adding major features, routes, or architectural changes.*
