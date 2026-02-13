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

#### 1. 개발 모드 (로컬)
```bash
node scripts/preflight.mjs
# 또는
node scripts/preflight.mjs --mode=dev
```
- DATABASE_URL 없으면 WARN (FAIL 아님)
- 코드 구조 위주 검증

#### 2. CI 모드 (GitHub Actions)
```bash
node scripts/preflight.mjs --mode=ci
```
- DATABASE_URL 체크 SKIP (secrets 없을 수 있음)
- TypeScript/빌드 HARD FAIL
- 자동으로 GitHub Actions에서 실행됨

#### 3. 프로덕션 준비 모드 (배포 전)
```bash
node scripts/preflight.mjs --mode=prod
```
- 모든 환경변수 필수 (HARD FAIL)
- DB 실제 연결 체크
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

### ADMIN 인증 설정

프로덕션 점검 API는 토큰 인증만 지원합니다:

```bash
# .env.local
ADMIN_PREFLIGHT_TOKEN=your-secret-token-here

# Amplify 환경변수에도 동일하게 설정
```

### CI/CD 통합

`.github/workflows/preflight.yml`이 자동으로 실행됩니다:
- PR/push 시 자동 점검
- TypeScript 타입 체크
- 빌드 검증
- DB 없이도 동작 (CI 모드)

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
