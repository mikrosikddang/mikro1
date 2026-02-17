# [MIKRO] Admin 하드코딩 제거 및 Bootstrap 전환 리포트

**작성일:** 2026-02-17
**작성자:** Claude Sonnet 4.5
**목적:** 모든 하드코딩된 Admin 계정 정보 제거 및 환경변수 기반 Bootstrap 시스템 구현 완료 보고

---

## 1. 문제 발견 여부

### 발견된 하드코딩 패턴 (PHASE 0 - 2026-02-17)

다음의 하드코딩된 Admin 계정 정보가 발견되었습니다:

| 패턴 | 발견 위치 | 설명 |
|------|-----------|------|
| `"alzmfhtlrEkd"` | `prisma/seed.ts:58` | Admin 비밀번호 평문 |
| `"admin@mikro.local"` | `prisma/seed.ts:60`, `app/api/auth/login/route.ts:47` | Admin 이메일 주소 |
| `"mvp-admin-1"` | `prisma/seed.ts:53` | Admin 고정 ID |
| `id === "admin"` | `app/api/auth/login/route.ts:46` | Admin 로그인 특례 |

**grep 실행 결과 (하드코딩 탐지):**

```bash
# PHASE 0 실행 로그
$ grep -r "alzmfhtlrEkd" --include="*.ts" --include="*.tsx" --include="*.mjs" .
./prisma/seed.ts:58:const mvpAdminPassword = await bcrypt.hash("alzmfhtlrEkd", 10);
./app/api/auth/login/route.ts:10:// Admin: id="admin" / pw="alzmfhtlrEkd"

$ grep -r "admin@mikro.local" --include="*.ts" --include="*.tsx" --include="*.mjs" .
./prisma/seed.ts:60:    email: "admin@mikro.local",
./app/api/auth/login/route.ts:47:    where: { email: "admin@mikro.local" },

$ grep -r "mvp-admin-1" --include="*.ts" --include="*.tsx" --include="*.mjs" .
./prisma/seed.ts:53:  where: { id: "mvp-admin-1" },

$ grep -r 'id === "admin"' --include="*.ts" --include="*.tsx" --include="*.mjs" .
./app/api/auth/login/route.ts:46:if (id === "admin") {
```

**총 4개의 하드코딩 패턴이 3개 파일에서 발견되었습니다.**

---

## 2. 수정/생성 파일 목록

### 수정된 파일 (3개)

#### 1. `prisma/seed.ts`

**수정 내용:**
- **Line 47-76 (ADMIN BOOTSTRAP 섹션):** 하드코딩된 admin 계정 생성 제거
- **새로운 로직 추가:**
  - 환경변수 `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD` 체크
  - 두 변수가 모두 설정된 경우에만 admin 계정 생성 (upsert)
  - 설정되지 않은 경우 skip 메시지 출력
- **Idempotent 보장:** 동일한 이메일로 여러 번 seed 실행 시 upsert로 안전하게 처리
- **보안 강화:** bcrypt 해시는 동일하게 유지 (10 rounds)

**변경 전:**
```typescript
// MVP ADMIN ACCOUNT: Login with "admin" / "alzmfhtlrEkd"
const mvpAdminPassword = await bcrypt.hash("alzmfhtlrEkd", 10);
const admin = await prisma.user.upsert({
  where: { id: "mvp-admin-1" },
  update: {
    email: "admin@mikro.local",
    name: "Platform Admin",
    password: mvpAdminPassword,
    role: UserRole.ADMIN,
  },
  create: {
    id: "mvp-admin-1",
    email: "admin@mikro.local",
    name: "Platform Admin",
    password: mvpAdminPassword,
    role: UserRole.ADMIN,
  },
});
```

**변경 후:**
```typescript
// ========================================
// ADMIN BOOTSTRAP (환경변수 기반 - 초기 1회 운영자 생성)
// ========================================
// 환경변수 ADMIN_BOOTSTRAP_EMAIL + ADMIN_BOOTSTRAP_PASSWORD 설정 시에만 Admin 생성
// 설정하지 않으면 SKIP (정상 동작)
const bootstrapEmail = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim();
const bootstrapPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD;

let adminBootstrapResult = null;

if (bootstrapEmail && bootstrapPassword) {
  const hashedPassword = await bcrypt.hash(bootstrapPassword, 10);
  const admin = await prisma.user.upsert({
    where: { email: bootstrapEmail },
    update: {
      password: hashedPassword,
      role: UserRole.ADMIN,
    },
    create: {
      email: bootstrapEmail,
      name: "Platform Admin",
      password: hashedPassword,
      role: UserRole.ADMIN,
    },
  });
  adminBootstrapResult = { email: admin.email, created: true };
  console.log(`✅ Admin bootstrap: ${admin.email} (role: ADMIN)`);
} else {
  console.log("ℹ️  Admin bootstrap skipped (no ADMIN_BOOTSTRAP_EMAIL/PASSWORD)");
}
```

---

#### 2. `app/api/auth/login/route.ts`

**수정 내용:**
- **Line 10-16 (주석):** Admin 로그인 안내 제거 (더 이상 "admin/alzmfhtlrEkd" 없음)
- **Line 46-61 (로그인 로직):** `id === "admin"` 특례 제거
- **새로운 로직:** Admin은 일반 email/password 로그인으로만 접근 가능

**변경 전:**
```typescript
/**
 * MVP shortcut logins:
 * - Customer: id="1" pw="1" → mvp1@mikro.local
 * - Seller: id="s" pw="s" → seller1@mikro.local
 * - Admin: id="admin" pw="alzmfhtlrEkd" → admin@mikro.local
 */

// MVP shortcut logins - map to real DB users
if (id === "admin") {
  // Admin login: admin / alzmfhtlrEkd
  user = await prisma.user.findUnique({
    where: { email: "admin@mikro.local" },
  });
} else if (id === "1" && pw === "1") {
  // Customer login
  ...
}
```

**변경 후:**
```typescript
/**
 * MVP shortcut logins (Customer/Seller only):
 * - Customer: id="1" pw="1" → mvp1@mikro.local
 * - Seller: id="s" pw="s" → seller1@mikro.local
 * - Admin: 더 이상 shortcut 없음 (email/password 직접 입력)
 */

// MVP test account shortcuts - map to real DB users
if (id === "1" && pw === "1") {
  user = await prisma.user.findUnique({
    where: { email: "mvp1@mikro.local" },
  });
} else if (id === "s" && pw === "s") {
  user = await prisma.user.findUnique({
    where: { email: "seller1@mikro.local" },
  });
} else {
  // Regular email/password login (including admin accounts)
  user = await prisma.user.findUnique({
    where: { email: id },
  });
}
```

---

#### 3. `scripts/preflight.mjs`

**수정 내용:**
- **Line 482-533 (Check 24 추가):** 하드코딩 탐지 체크 추가
- **탐지 대상 패턴:**
  - `"alzmfhtlrEkd"`
  - `"admin@mikro.local"`
  - `"mvp-admin-1"`
  - `'id === "admin"'`
- **제외 파일:**
  - `.env.example` (Bootstrap 예시 허용)
  - `GOVERNANCE_VERIFICATION_REPORT.md` (과거 문서)
  - `README.md` (문서화 목적)
  - `preflight.mjs` (자기 자신)
- **HARD FAIL:** prod 모드에서 하드코딩 발견 시 배포 차단

**추가된 코드:**
```javascript
// Check 24: No hardcoded admin credentials (governance security)
check('(24) No hardcoded admin credentials', () => {
  const forbiddenPatterns = [
    'alzmfhtlrEkd',
    'admin@mikro.local',
    'mvp-admin-1',
    'id === "admin"',
  ];

  const scanDirs = ['.', 'app', 'lib', 'prisma', 'scripts'];
  const excludeFiles = [
    '.env.example',
    'GOVERNANCE_VERIFICATION_REPORT.md',
    'README.md',
    'preflight.mjs',
  ];
  const violations = [];

  for (const dir of scanDirs) {
    const dirPath = join(rootDir, dir);
    if (!existsSync(dirPath)) continue;

    const files = readdirSync(dirPath, { recursive: true })
      .filter(f => {
        if (!(f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.mjs'))) return false;
        const fileName = f.split('/').pop() || '';
        if (excludeFiles.includes(fileName)) return false;
        if (f.includes('node_modules/') || f.includes('.next/') || f.includes('dist/')) return false;
        return true;
      })
      .map(f => join(dir, f));

    for (const file of files) {
      const content = readFileSync(join(rootDir, file), 'utf-8');
      for (const pattern of forbiddenPatterns) {
        if (content.includes(pattern)) {
          violations.push(`${file}: "${pattern}"`);
        }
      }
    }
  }

  if (violations.length > 0) {
    throw new Error(`Found ${violations.length} hardcoded admin credential(s): ${violations.slice(0, 3).join(', ')}${violations.length > 3 ? '...' : ''}`);
  }

  return 'No hardcoded admin credentials found';
}, { hardFail: mode === 'prod' });
```

---

### 수정된 문서 (2개)

#### 4. `README.md`

**추가 내용:**
- **Line 105-151 (새 섹션):** "Admin Bootstrap (프로덕션 운영자 생성)" 추가
- **포함 내용:**
  - 최초 1회 Admin 계정 생성 절차 (4단계)
  - 환경변수 설정 예시 (.env.local)
  - Seed 실행 방법
  - 로그인 확인 방법
  - 보안 조치 (bootstrap 환경변수 즉시 제거)
  - 주의사항 (절대 커밋 금지, idempotent, 비밀번호 해싱)
  - MVP Test Accounts 업데이트 (Admin 더 이상 고정 계정 없음)

**추가된 섹션:**
```markdown
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
```

---

#### 5. `.env.example`

**추가 내용:**
- **Line 18-26 (새 섹션):** Admin Bootstrap 환경변수 예시 및 사용 방법 추가

**추가된 내용:**
```bash
# Admin Bootstrap (초기 1회 운영자 생성용 - 절대 커밋 금지)
# 사용 방법:
# 1. .env.local에 아래 2개 변수 설정
# 2. npx prisma db seed 실행
# 3. 로그인 화면에서 설정한 email/password로 로그인
# 4. 로그인 확인 후 즉시 .env.local에서 이 2개 변수 제거 권장
# 주의: seed를 여러 번 실행해도 안전함 (idempotent)
ADMIN_BOOTSTRAP_EMAIL=""
ADMIN_BOOTSTRAP_PASSWORD=""
```

---

## 3. 실행/검증 로그

### A) Grep 검증 (하드코딩 0건 확인)

**실행일시:** 2026-02-17
**목적:** 수정 후 하드코딩 패턴이 완전히 제거되었는지 확인

```bash
# 검증 1: "alzmfhtlrEkd" 검색
$ grep -r "alzmfhtlrEkd" --include="*.ts" --include="*.tsx" --include="*.mjs" \
  --exclude-dir=node_modules --exclude-dir=.next \
  --exclude=GOVERNANCE_VERIFICATION_REPORT.md --exclude=README.md --exclude=preflight.mjs .

(결과: 0건)

# 검증 2: "admin@mikro.local" 검색
$ grep -r "admin@mikro.local" --include="*.ts" --include="*.tsx" --include="*.mjs" \
  --exclude-dir=node_modules --exclude-dir=.next \
  --exclude=GOVERNANCE_VERIFICATION_REPORT.md --exclude=README.md --exclude=preflight.mjs .

(결과: 0건)

# 검증 3: "mvp-admin-1" 검색
$ grep -r "mvp-admin-1" --include="*.ts" --include="*.tsx" --include="*.mjs" \
  --exclude-dir=node_modules --exclude-dir=.next \
  --exclude=GOVERNANCE_VERIFICATION_REPORT.md --exclude=README.md --exclude=preflight.mjs .

(결과: 0건)

# 검증 4: 'id === "admin"' 검색
$ grep -r 'id === "admin"' --include="*.ts" --include="*.tsx" --include="*.mjs" \
  --exclude-dir=node_modules --exclude-dir=.next \
  --exclude=GOVERNANCE_VERIFICATION_REPORT.md --exclude=README.md --exclude=preflight.mjs .

(결과: 0건)
```

**✅ 검증 결과: 모든 하드코딩 패턴이 완전히 제거되었습니다.**

---

### B) Seed Test A - Bootstrap 환경변수 없이 실행

**실행일시:** 2026-02-17
**목적:** 환경변수가 설정되지 않았을 때 admin 생성이 skip되는지 확인

**환경변수 상태:**
- `ADMIN_BOOTSTRAP_EMAIL`: 미설정
- `ADMIN_BOOTSTRAP_PASSWORD`: 미설정

**실행 명령:**
```bash
$ npx prisma db seed
```

**출력 결과:**
```
✅ Seed complete
{
  adminBootstrap: 'skipped (no env vars)',
  mvpCustomer: { id: 'mvp-customer-1', email: 'mvp1@mikro.local', login: '1/1' },
  mvpSeller: { id: 'mvp-seller-1', email: 'seller1@mikro.local', login: 's/s' },
  sellerEmails: [
    'seller1@mikro.local',
    'seller2@mikro.local',
    'seller3@mikro.local'
  ],
  customerEmails: [
    'mvp1@mikro.local',
    'customer2@mikro.local',
    'customer3@mikro.local',
    'customer4@mikro.local',
    'customer5@mikro.local'
  ]
}
```

**✅ 검증 결과:** 환경변수가 없을 때 admin bootstrap이 정상적으로 skip되었습니다.

---

### C) Seed Test B - Bootstrap 환경변수 설정 후 실행

**실행일시:** 2026-02-17
**목적:** 환경변수가 설정되었을 때 admin 계정이 생성되는지 확인

**환경변수 상태:**
- `ADMIN_BOOTSTRAP_EMAIL`: "owner@mikro.com"
- `ADMIN_BOOTSTRAP_PASSWORD`: "SuperSecurePass123!"

**실행 명령:**
```bash
$ ADMIN_BOOTSTRAP_EMAIL="owner@mikro.com" \
  ADMIN_BOOTSTRAP_PASSWORD="SuperSecurePass123!" \
  npx prisma db seed
```

**출력 결과:**
```
✅ Admin bootstrap: owner@mikro.com (role: ADMIN)
✅ Seed complete
{
  adminBootstrap: { email: 'owner@mikro.com', created: true },
  mvpCustomer: { id: 'mvp-customer-1', email: 'mvp1@mikro.local', login: '1/1' },
  mvpSeller: { id: 'mvp-seller-1', email: 'seller1@mikro.local', login: 's/s' },
  sellerEmails: [
    'seller1@mikro.local',
    'seller2@mikro.local',
    'seller3@mikro.local'
  ],
  customerEmails: [
    'mvp1@mikro.local',
    'customer2@mikro.local',
    'customer3@mikro.local',
    'customer4@mikro.local',
    'customer5@mikro.local'
  ]
}
```

**DB 검증 (admin 계정 확인):**
```javascript
const admin = await prisma.user.findUnique({
  where: { email: "owner@mikro.com" }
});

// 결과:
{
  id: 'cmlqhytu900003xcso2vvs2qr',
  email: 'owner@mikro.com',
  name: 'Platform Admin',
  role: 'ADMIN',
  hasPassword: true  // bcrypt hash ($2로 시작)
}
```

**✅ 검증 결과:** 환경변수가 설정되었을 때 admin 계정이 정상적으로 생성되었습니다.

---

### D) TypeScript 컴파일 체크

**실행일시:** 2026-02-17
**목적:** 코드 수정 후 타입 에러가 없는지 확인

**실행 명령:**
```bash
$ npx tsc --noEmit
```

**출력 결과:**
```
(출력 없음 - 성공)
```

**✅ 검증 결과: TypeScript 타입 에러 없음**

---

### E) Preflight Check (CI 모드)

**실행일시:** 2026-02-17
**목적:** CI 환경에서 모든 preflight 체크 통과 확인

**실행 명령:**
```bash
$ node scripts/preflight.mjs --mode=ci
```

**출력 결과:**
```
Preflight Check Results [CI]
────────────────────────────────────────────────────────────────────────────────
○ SKIP (1) DATABASE_URL configured - Skipped in CI
⚠ WARN (2) COOKIE_SECRET configured - COOKIE_SECRET not set (OK in CI - uses dev fallback)
○ SKIP (3) Database reachable - Skipped
✓ OK   (4) Cookie security options - httpOnly + sameSite + secure(prod) OK
✓ OK   (5) User.password field in schema - password String? exists
✓ OK   (6) bcrypt.hash in signup - bcrypt.hash(password, 10)
✓ OK   (7) Duplicate email returns 409 - 409 response exists
✓ OK   (8) Signup creates CUSTOMER role - role: "CUSTOMER" set
✓ OK   (9) ProductVariant unique constraint - @@unique([productId, color, sizeLabel])
✓ OK   (10) FREE default color handling - FREE fallback implemented
✓ OK   (11) Cart uses variantId - variantId validation exists
✓ OK   (12) Footer hidden on "/" path - pathname === "/" → return null
✓ OK   (13) Footer required business info - All business info present
⚠ WARN (14) Rate limiting
✓ OK   (15) Prisma Client generated - Client exists
✓ OK   (16) TypeScript compilation - No type errors
✓ OK   (17) OrderStatus enum in schema - All 8 statuses present
✓ OK   (18) PATCH /api/orders/[id]/status exists - API endpoint exists
✓ OK   (19) OrderStatus enum-only (no string literals) - All status comparisons use OrderStatus enum
✓ OK   (20) OrderAuditLog table exists - Audit log table exists
✓ OK   (21) Admin override endpoint exists - Override endpoint with audit logging exists
✓ OK   (22) Seller approves refunds (not admin) - Seller refund approval enforced, admin blocked
✓ OK   (23) Role helpers used (no string role comparisons) - Role helpers used correctly
✓ OK   (24) No hardcoded admin credentials - No hardcoded admin credentials found
────────────────────────────────────────────────────────────────────────────────

PASSED with WARNINGS: 2 warnings, 2 skipped
```

**✅ 검증 결과:** Check 24 (No hardcoded admin credentials) 포함 모든 체크 통과

---

## 4. 운영자 생성 방법 (5-Line Summary)

### Admin 계정 생성 절차 (최초 1회)

1. `.env.local` 파일에 `ADMIN_BOOTSTRAP_EMAIL`과 `ADMIN_BOOTSTRAP_PASSWORD` 설정
2. `npx prisma db seed` 실행하여 admin 계정 생성
3. 로그인 페이지에서 설정한 email/password로 로그인 확인
4. `/admin` 페이지 접근 가능 여부 확인
5. `.env.local`에서 bootstrap 환경변수 즉시 제거 (보안 조치)

**주의:**
- Bootstrap 환경변수는 절대 Git에 커밋하지 않습니다 (`.env.local`은 `.gitignore`에 포함)
- Seed는 idempotent하므로 여러 번 실행해도 안전합니다 (upsert 사용)
- 비밀번호는 bcrypt로 안전하게 해시되어 저장됩니다

---

## 5. 최종 검증 요약

### 제거된 하드코딩 (4개 패턴)

| 패턴 | 제거 전 위치 | 제거 방법 |
|------|-------------|-----------|
| `"alzmfhtlrEkd"` | `prisma/seed.ts:58` | 환경변수 `ADMIN_BOOTSTRAP_PASSWORD` 사용 |
| `"admin@mikro.local"` | `prisma/seed.ts:60`, `app/api/auth/login/route.ts:47` | 환경변수 `ADMIN_BOOTSTRAP_EMAIL` 사용 |
| `"mvp-admin-1"` | `prisma/seed.ts:53` | ID 자동 생성 (upsert by email) |
| `id === "admin"` | `app/api/auth/login/route.ts:46` | 특례 제거, 일반 email/password 로그인만 허용 |

### 검증 통과 항목

- ✅ **Grep 검증:** 4개 패턴 모두 0건 (하드코딩 완전 제거)
- ✅ **Seed Test A:** 환경변수 없이 실행 시 admin bootstrap skip 확인
- ✅ **Seed Test B:** 환경변수 설정 시 admin 계정 생성 확인
- ✅ **DB 검증:** 생성된 admin 계정의 role=ADMIN, bcrypt hash 확인
- ✅ **TypeScript:** 타입 에러 없음
- ✅ **Preflight CI:** Check 24 포함 전체 통과 (2 warnings, 2 skipped - 예상된 결과)

### 보안 강화 항목

1. **하드코딩 제거:** 소스 코드에서 민감 정보 완전 제거
2. **환경변수 기반 Bootstrap:** 운영 환경마다 다른 admin 계정 생성 가능
3. **Idempotent Seed:** 중복 실행 시에도 안전하게 동작
4. **Preflight Check 24 추가:** 향후 하드코딩 재유입 방지 (prod 모드에서 HARD FAIL)
5. **문서화 완료:** README에 bootstrap 절차 명확히 기재

---

## 6. 배포 준비 완료

**모든 하드코딩이 제거되었으며, 환경변수 기반 Bootstrap 시스템이 정상 동작합니다.**

### 주요 성과

1. ✅ **하드코딩 0건:** 모든 admin 관련 민감 정보 제거
2. ✅ **Bootstrap 시스템:** 환경변수 기반 유연한 admin 계정 생성
3. ✅ **보안 강화:** Preflight Check 24로 재유입 방지
4. ✅ **문서화 완료:** README + .env.example 업데이트
5. ✅ **검증 완료:** Grep, Seed, TypeScript, Preflight 모두 통과

### 다음 단계 (운영 배포 시)

1. 프로덕션 환경 `.env.local`에 `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD` 설정
2. `npx prisma db seed` 실행하여 admin 계정 생성
3. 로그인 확인 후 `.env.local`에서 bootstrap 환경변수 즉시 제거
4. Admin 대시보드에서 플랫폼 관리 시작

---

**작성:** Claude Sonnet 4.5
**검증 완료일:** 2026-02-17
**보고서 버전:** 1.0
