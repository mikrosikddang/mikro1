This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Preflight Checks (배포 전 점검)

배포 전 16개 항목을 자동으로 점검하는 스크립트입니다. **HARD FAIL**(배포 시 치명적)과 **SOFT WARN**(MVP에서 허용)을 구분합니다.

### 실행 방법

**중요:** prod 모드는 `.env.local` 파일에서 환경변수를 로드합니다. 실행 전에 `.env.local`에 필수 환경변수(`DATABASE_URL`, `COOKIE_SECRET`)를 설정하세요.

#### 1. 개발 모드 (로컬)
```bash
node scripts/preflight.mjs
# 또는
node scripts/preflight.mjs --mode=dev
```
- `.env.local` 또는 `.env` 파일에서 환경변수 로드
- DATABASE_URL 없으면 WARN (FAIL 아님)
- 코드 구조 위주 검증

#### 2. CI 모드 (GitHub Actions)
```bash
node scripts/preflight.mjs --mode=ci
```
- `.env` 파일 로드하지 않음 (GitHub Actions 환경변수 사용)
- DATABASE_URL 체크 SKIP (DB 연결 불필요)
- COOKIE_SECRET 체크 WARN (CI는 auth.ts 개발 fallback 사용)
- TypeScript/빌드 HARD FAIL
- 자동으로 GitHub Actions에서 실행됨

#### 3. 프로덕션 준비 모드 (배포 전)
```bash
node scripts/preflight.mjs --mode=prod
```
- **필수:** `.env.local`에 `DATABASE_URL`, `COOKIE_SECRET` 설정
- `.env.local` 파일에서 환경변수 로드
- 모든 환경변수 필수 (HARD FAIL)
- DB 실제 연결 체크 (로컬 스크립트에서는 SKIP, `/api/debug/preflight`에서 런타임 체크)
- 가장 엄격한 검증

#### 4. 프로덕션 운영 점검 (배포 후)
```bash
PROD_URL=https://main.xxx.amplifyapp.com ADMIN_PREFLIGHT_TOKEN=your-token node scripts/prod-preflight.mjs
```
- 실제 배포된 환경의 `/api/debug/preflight` API 호출
- 런타임 DB 연결, bcrypt 사용, 환경변수 등 검증
- 8초 타임아웃

### 점검 항목 (HARD FAIL vs SOFT WARN)

| # | 항목 | dev | ci | prod | 설명 |
|---|------|-----|-----|------|------|
| 1 | DATABASE_URL | WARN | SKIP | **FAIL** | 프로덕션 필수 |
| 2 | COOKIE_SECRET | WARN | WARN | **FAIL** | 세션 서명 키 |
| 3 | DB Connection | SKIP | SKIP | **FAIL** | 실제 연결 가능 여부 |
| 4 | Cookie Options | **FAIL** | **FAIL** | **FAIL** | httpOnly/sameSite/secure |
| 5 | User.password | OK | OK | OK | Schema 필드 존재 |
| 6 | bcrypt.hash | **FAIL** | **FAIL** | **FAIL** | 비밀번호 해싱 |
| 7 | Duplicate 409 | OK | OK | OK | 중복 이메일 처리 |
| 8 | role=CUSTOMER | OK | OK | OK | 회원가입 기본 역할 |
| 9 | Variant unique | **FAIL** | **FAIL** | **FAIL** | DB 제약 조건 |
| 10 | FREE default | OK | OK | OK | 컬러 기본값 |
| 11 | variantId | OK | OK | OK | 장바구니 로직 |
| 12 | Footer "/" hidden | OK | OK | OK | 홈 숨김 룰 |
| 13 | Footer business info | WARN | WARN | **FAIL** | 사업자 정보 (법적 필수) |
| 14 | Rate limiting | WARN | WARN | WARN | MVP 미구현 |
| 15 | Prisma Client | WARN | **FAIL** | **FAIL** | 생성 여부 |
| 16 | TypeScript | WARN | **FAIL** | **FAIL** | 타입 에러 |

### Admin Bootstrap (프로덕션 운영자 생성)

플랫폼 운영자(ADMIN) 계정은 코드에 하드코딩되지 않으며, **환경변수 기반 Bootstrap**으로 생성합니다.

#### 최초 1회 Admin 계정 생성 절차

1. **환경변수 설정** (`.env.local`)
```bash
# .env.local (절대 커밋 금지!)
ADMIN_BOOTSTRAP_EMAIL="owner@yourdomain.com"
ADMIN_BOOTSTRAP_PASSWORD="your-strong-password"
```

2. **Seed 실행**
```bash
npx prisma db seed
```
출력 예시:
```
✅ Admin bootstrap: owner@yourdomain.com (role: ADMIN)
✅ Seed complete
```

3. **로그인 확인**
- 로그인 페이지에서 설정한 email/password로 로그인
- `/admin` 페이지 접근 확인

4. **보안 조치 (필수)**
```bash
# .env.local에서 bootstrap 환경변수 즉시 제거
# ADMIN_BOOTSTRAP_EMAIL= (삭제)
# ADMIN_BOOTSTRAP_PASSWORD= (삭제)
```

#### 주의사항

- ⚠️ **절대 커밋 금지**: Bootstrap 환경변수는 `.env.local`에만 설정 (`.gitignore`에 포함됨)
- ✅ **Idempotent**: Seed를 여러 번 실행해도 안전 (이메일 기준 upsert)
- ✅ **비밀번호 해싱**: bcrypt로 안전하게 해시되어 저장
- 🔒 **프로덕션**: 운영 환경에서는 seed가 아닌 별도 admin 관리 UI 권장 (향후 구현)

#### MVP Test Accounts

일반 사용자용 테스트 계정 (seed 자동 생성):
- **Customer**: id=`1`, password=`1`
- **Seller**: id=`s`, password=`s`
- **Admin**: 더 이상 고정 계정 없음 (bootstrap으로 생성 필요)

---

### ADMIN 인증 설정 (Preflight API)

프로덕션 점검 API는 토큰 인증만 지원합니다:

```bash
# .env.local
ADMIN_PREFLIGHT_TOKEN=your-secret-token-here

# Amplify 환경변수에도 동일하게 설정
```

### API 응답 형식

`/api/debug/preflight` 응답의 `checks` 객체는 `boolean | string` 혼합 타입입니다:
- `boolean`: 명확한 pass/fail 체크 (예: `hasDatabaseUrl`, `dbReachable`)
- `string`: 설명이 필요한 체크 (예: `cookieFlagsOk: "secure+httpOnly expected"`)
- 에러 시 `"query_failed"`, `"no_users_with_password"` 등 상태 문자열 반환

### CI/CD 통합

`.github/workflows/preflight.yml`이 자동으로 실행됩니다:

**코드 변경 시 (PR/push):**
- CI 모드로 preflight 실행
- TypeScript 타입 체크
- 빌드 검증
- DB 없이도 동작

**프로덕션 런타임 검증 (자동):**
- 매일 00:00 UTC (09:00 KST) 자동 실행
- `/api/debug/preflight` API 호출하여 실제 프로덕션 환경 점검
- 수동 실행: GitHub Actions → "Preflight Checks" → "Run workflow"
- 필수 GitHub Secrets:
  - `PROD_URL`: 프로덕션 URL (예: `https://main.xxx.amplifyapp.com`)
  - `ADMIN_PREFLIGHT_TOKEN`: API 인증 토큰

### 트러블슈팅

**"DATABASE_URL not set" WARN (dev 모드)**
```bash
cp .env.example .env.local
# DATABASE_URL 값 입력
```

**"Unauthorized - ADMIN_PREFLIGHT_TOKEN required" (401)**
```bash
# Amplify 환경변수에 토큰 설정 확인
# 로컬 .env.local에도 동일한 값 설정
```

**"Request timeout (8s)" (프로덕션 점검)**
```bash
# 프로덕션 URL 접근 가능 여부 확인
# Amplify 배포 완료 여부 확인
```

### 보안 주의사항

- ✅ DATABASE_URL, COOKIE_SECRET 원문 노출 금지
- ✅ preflight API는 boolean/문자열 요약만 반환
- ✅ PII (이메일, 주소 등) 노출 금지
- ✅ bcrypt 체크는 "$2" prefix만 확인
