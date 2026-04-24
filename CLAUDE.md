# MIKRO 개발 플레이북

> 이 문서는 MIKRO 프로젝트의 최우선 개발 규칙이다. 모든 팀원은 이 문서를 따른다.

---

## 공통 운영 규칙

1. **Push/배포/빌드는 사용자 지시 시에만.** 기본은 로컬 확인.
2. **최소 변경 원칙.** 요구사항 범위를 넘어 전체 리팩터링 금지.
3. **하드코딩된 계정/role 특례/운영자 우회 로직 금지.**
4. **UI/UX 기준은 PD가 수치로 정의.** 감각적 표현("적당히", "좀 줄여서") 금지.
5. **모든 변경은 역할별 검증:** FE/BE 구현 → QA 테스트 → SV 통합 보고.
6. **기존에 동작하던 기능을 깨뜨리지 않는다.** 보안/성능 개선 시 반드시 기존 기능 회귀 테스트 포함.
7. **tsc --noEmit 체크는 커밋/푸시 시에만 수행.**
8. **Node/npm 버전 일치.** 로컬 개발은 `.nvmrc`(node 22.18.0) + npm 10.x 를 사용한다.
   - Amplify 빌드 환경이 npm 10 이라 npm 11 로 만든 lockfile 은 `npm ci` 가 거부할 수 있다.
   - 의존성 추가/삭제 시 `nvm use` 후 `npm install` 또는 `npx npm@10 install` 로 lock 재생성.
   - 커밋 전 `rm -rf node_modules && npm ci` 로 사전 검증 권장.

---

## Supervisor (SV)

### 역할
- 목표 정의, 우선순위 관리, 리스크 판단
- 작업을 FE/BE/QA/PD에게 분배
- 직접 구현 최소화
- 매 라운드 보고 포맷 준수

### 보고 포맷
```
(1) 목표 요약
(2) 역할별 결론 (FE / BE / QA / PD)
(3) 변경 계획 (파일 단위 + 영향 범위 + 권한 영향)
(4) 로컬 실행 결과
(5) diff 요약 + QA 체크리스트
```

### 주의사항
- 보안/인프라 변경 시 기존 기능 영향 분석 필수 (CSP 사례 참고)
- 팀원에게 작업 할당 시 변경 금지 항목을 명시적으로 전달

---

## Frontend Developer (FE)

### 담당
- Next.js App Router, React Component, Tailwind UI
- Client state, UX interaction
- 바텀시트 / 토글 / 그리드 / 피드 UI

### 원칙
1. PD의 수치 기준을 그대로 따른다.
2. 기존 UX 구조를 통째로 바꾸지 않는다.
3. 스타일 중복 금지 → 공통 컴포넌트화.
4. 로컬에서 반드시 동작 확인.

### 금지
- API 로직 수정
- Prisma 스키마 변경
- role 판별 하드코딩

### 체크리스트 (구현 완료 시)
- [ ] 변경한 컴포넌트가 사용되는 모든 페이지에서 동작 확인
- [ ] variant/color 표시가 필요한 곳은 전부 확인 (상세, 장바구니, 주문, 결제, 상품관리, 수정)
- [ ] 사이즈 정렬: XS → S → M → L → XL → XXL → FREE
- [ ] color가 "FREE"인 경우 컬러 UI 미표시
- [ ] 에러 메시지는 한국어로
- [ ] next/image 사용 (raw img 금지), remotePatterns 등록 확인

---

## Backend Developer (BE)

### 담당
- Next.js API routes, Prisma schema
- Role guard, Business logic, Audit log
- Follow / Favorite / ColorKey / Category depth 데이터 처리

### 원칙
1. DB 변경은 꼭 필요할 때만.
2. 스키마 변경 시: 하위 호환 유지, null 허용 고려, 기존 데이터 영향 분석.
3. API는 반드시 role guard 포함.
4. 401/403/409 명확히 구분.
5. 에러 응답에 내부 정보(err.message, stack trace) 노출 금지. 일반 한국어 메시지만 반환.

### 금지
- UI 구조 수정
- 프론트 스타일 건드리기

### 체크리스트 (구현 완료 시)
- [ ] 새 필드 추가 시 기존 데이터와 호환 (nullable 또는 default)
- [ ] Rate limit 설정 시 실제 사용 패턴 고려 (이미지 업로드 시 presign 횟수 등)
- [ ] 보안 헤더(CSP 등) 변경 시 S3 업로드, 외부 이미지, 폰트 등 기존 외부 연결 확인

### 교훈: CSP 사고 사례
> CSP `connect-src 'self'`를 설정하면서 S3 presigned URL PUT이 차단됨.
> 보안 강화 시 반드시 기존 외부 연결 목록을 확인하고 화이트리스트에 포함할 것.
>
> 현재 필요한 외부 연결:
> - `connect-src`: `https://*.s3.ap-northeast-2.amazonaws.com`, `https://*.s3.amazonaws.com`
> - `img-src`: `https://images.unsplash.com`, `data:`, `blob:`
> - `font-src`: `data:` (Next.js base64 inline fonts)

---

## Tester (QA)

### 담당
- 로컬 기능 테스트
- 권한 테스트 (CUSTOMER / SELLER / ADMIN)
- 경계값 테스트, 회귀 테스트
- **보안 테스트**

### 항상 확인
- 비로그인 상태
- 로그인 상태
- 자기 상점 vs 타인 상점
- API 에러 코드
- DB 저장/로드 정합성

### 보안 검증 항목
1. 보안 헤더 — curl로 응답 헤더 확인 (CSP, HSTS, X-Frame-Options 등)
2. Rate Limiting — 제한 초과 시 429 반환 확인
3. 인증/인가 — 비로그인/권한 없는 역할로 API 접근 시 401/403 확인
4. 에러 노출 — API 에러 응답에 스택 트레이스/내부 정보 미노출 확인
5. Cookie 보안 — HttpOnly, Secure, SameSite 속성 확인
6. CORS — 허용되지 않은 origin에서 API 접근 차단 확인
7. 입력값 검증 — XSS 페이로드, SQL injection 시도 시 방어 확인

### 보고 형식
```
TC-번호 (기능) / SEC-번호 (보안) / E2E-번호 (통합)
- Steps
- Expected
- Actual
- Result (PASS/FAIL)
```

### 체크리스트 (검증 완료 시)
- [ ] 코드 리뷰뿐 아니라 **실제 동작 테스트** 수행 (curl, dev 서버)
- [ ] 보안 설정 변경 후 기존 기능 회귀 테스트 필수 (S3 업로드, 이미지 로딩, 폰트 등)
- [ ] variant/color가 표시되는 모든 페이지 확인
- [ ] 빌드 성공 확인

### 교훈: 보안 헤더 회귀 사고
> CSP 보안 헤더 검증 시 코드 리뷰만 수행하고 실제 S3 업로드 플로우를 테스트하지 않음.
> 결과: 상품 등록 "Failed to fetch" → CSP가 S3 PUT을 차단.
> **보안 설정 변경 후에는 반드시 실제 기능 동작을 테스트할 것.**

---

## Product Designer (PD)

### 담당
- 정보 계층, 타이포, 여백, 버튼 위치를 숫자로 정의
- 디자인 결정은 반드시 구체 수치 포함
- Do/Don't 리스트 제공
- FE가 오해하지 않도록 모호함 제거

### 수치 정의 예시
```
title: text-[18px] font-semibold
section gap: mt-6
divider: border-gray-200
selected: bg-gray-900 text-white (프리미엄 톤)
sub-selected: bg-gray-200 text-gray-900 border-gray-400
```

### 디자인 원칙
- 선택/활성 상태: `bg-gray-900` 또는 `bg-black` (다크 뉴트럴)
- 경고/주의: `amber` 계열
- 에러/파괴적 동작: `red` 계열 (이것만 red 사용)
- 브랜드 포인트: 위시리스트 하트, 결제 CTA에만 red 허용
- **빨간색을 선택/토글 버튼에 사용하지 않는다** (모던/프리미엄 톤 유지)

---

## 협업 흐름

```
PD → UI 기준 확정
FE → UI 구현
BE → API/DB 구현
QA → 로컬 테스트 + 보안 테스트
SV → 통합 보고
```

실패 시:
```
QA → 원인 분석 → 해당 역할 수정 → 재검증
```

---

## 절대 금지 사항

### 시드(seed) 재실행 금지
> **`npx prisma db seed`를 운영/개발 DB에서 절대 재실행하지 않는다.**
> 시드는 모든 테이블을 `deleteMany()`로 초기화한 후 목데이터를 넣는 스크립트다.
> 실행하면 실제 사용자, 주문, 상품 데이터가 전부 삭제된다.
>
> 시드에 안전장치가 있으나 (`--force` 없이는 기존 데이터가 있으면 중단),
> 어떤 상황에서도 팀원이 임의로 시드를 실행해서는 안 된다.
>
> **사고 사례:** 시드 재실행으로 어드민 계정 포함 운영 데이터 전체 삭제됨.

### 환경변수에 비밀번호 평문 저장 금지
> 어드민 비밀번호, API 키 등을 `.env`에 평문으로 저장하지 않는다.
> 계정 생성은 1회성 CLI 스크립트로 처리하고, 실행 후 비밀번호는 어디에도 남기지 않는다.

---

## 기술 스택 참고

| 항목 | 기술 |
|------|------|
| Framework | Next.js App Router |
| UI | Tailwind CSS |
| DB | Prisma + PostgreSQL |
| Storage | AWS S3 (presigned URL) |
| Auth | HMAC-SHA256 signed HttpOnly cookie |
| Image | next/image (remotePatterns 필수) |
| Rate Limit | Middleware sliding window |

## 외부 서비스 연결 목록 (CSP 화이트리스트)

| 서비스 | CSP directive | 도메인 |
|--------|---------------|--------|
| S3 이미지 업로드/표시 | connect-src, img-src | `*.s3.ap-northeast-2.amazonaws.com`, `*.s3.amazonaws.com` |
| Unsplash 이미지 | img-src | `images.unsplash.com` |
| Daum 우편번호 | script-src | `t1.daumcdn.net` |
| Next.js 폰트 | font-src | `data:` |
| Blob/Data URI | img-src | `data:`, `blob:` |

> **새로운 외부 서비스 연동 시 반드시 이 목록을 업데이트하고 CSP 헤더에 반영할 것.**
