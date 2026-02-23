# MIKRO — Multi-Agent Development Playbook (MIKRO_CLAUDE.md)

> **Role tags**: `[ALL]` = 전원, `[SV]` = Supervisor, `[DEV]` = Developer, `[QA]` = Tester, `[PD]` = Product Designer  
> **Project**: `mikro` (프로덕션급 패션/커머스 플랫폼)  
> **Goal**: “기능 완성”이 아니라 **프로덕션 퀄리티의 UX + 안정성 + 거버넌스(권한/감사/운영)** 를 동시에 유지하며 빠르게 반복한다.

---

## 0) Operating Rules (must-follow) `[ALL]`

### 팀 운영 5줄 요약 (초기 1회 공유용)
1. **SV가 목표/우선순위/리스크를 관리**하고 각 역할(DEV/QA/PD)에게 명확히 분배한다.  
2. **DEV는 최소 변경 원칙**으로 구현하며, “push/배포/빌드”는 **사용자가 지시할 때만** 한다. 기본은 로컬에서 확인.  
3. **PD는 UI/UX 기준(정보계층, 타이포, 간격, 컴포넌트 규칙)** 을 문서로 고정해 DEV/QA가 흔들리지 않게 한다.  
4. **QA는 증거 기반 검증**(재현 절차, 기대결과, 경계/권한 케이스, 회귀 체크리스트)을 운영한다.  
5. 변경이 들어가면 **SV가 통합 보고서 포맷으로 1회 정리**하고, QA가 “로컬 테스트 완료” 체크가 있어야 다음 라운드로 간다.

### Rules reminder (매 라운드 1줄 필수) `[SV]`
- **Push/배포/빌드(시간 오래 걸리는 것)는 “요청 받았을 때만” 진행. 기본은 로컬 확인.**

---

## 1) What this project is `[ALL]`
- `mikro`는 **판매자(SELLER)** / **구매자(CUSTOMER)** / **운영자(ADMIN)** 역할이 분리된 마켓플레이스다.
- 플랫폼 원칙: **운영은 SELLER가 수행**, ADMIN은 **감시/승인/분쟁 오버라이드(감사 로그 필수)** 만 수행.
- UX 원칙: 메인 피드는 “인스타그램형 피드”와 “당근형 리스트” 2개 모드를 제공하고, 셀러 상세(상점) 진입 시 3열 그리드가 “인스타 프로필 그리드”처럼 꽉 차게 보여야 한다.
- 입력 UX 원칙: 카테고리/색상/색상별 이미지 설정은 **바텀시트 기반, 단계별(depth) 탐색**, 최근/즐겨찾기/검색을 포함한다.

---

## 2) High-level architecture `[ALL]`
- Frontend: Next.js App Router, Tailwind 기반 UI.
- Backend: Next.js API routes + Prisma.
- Auth/Role: `UserRole` 단일 소스 + role helpers/guards(문자열 비교 금지).
- Governance: Admin override는 별도 endpoint + reason 필수 + audit log 기록.
- Uploads: 프로필 이미지/상품 이미지 등은 **사용자가 직접 업로드**(UI 제공). 저장은 DB에 URL 및 메타(예: colorKey)만 유지.

---

## 3) Core constraints (do not violate) `[ALL]`
### 프로덕션급 규칙
- **하드코딩 금지**: 계정/크리덴셜/role 특례(예: `id==="admin"`) 금지.  
- **권한/감사**: ADMIN이 예외 처리를 할 수 있다면 반드시 **감사 로그**가 남아야 한다.  
- **데이터 스키마 최소 변경**: 꼭 필요한 경우만 스키마 변경. 변경 시 하위호환/마이그레이션/검증 포함.  
- **UI 일관성**: 타이포/간격/버튼 규칙은 “미니 디자인 시스템”으로 고정한다. 임의 스타일 확산 금지.  
- **퍼포먼스/정합성**: 이미지 그리드/피드 렌더는 레이아웃 점프 최소화(고정 aspect), 무거운 계산은 서버/캐시 고려.

### “절대” 규칙
- DEV는 **사용자 승인 없이** `git push`, 배포, CI preflight 강제 실행을 하지 않는다.  
- 기능 추가 시 “기존 메인 UX를 통째로 바꾸는” 리팩터링은 금지. 필요한 범위만 변경.

---

## 4) Roles & responsibilities

### Supervisor `[SV]`
- 목표 정의, 범위/우선순위/리스크 관리, 작업 분배.
- 라운드 출력 포맷 고정(아래 “Round Output Format”).
- 변경이 있는 라운드에는 **QA 점검 항목**과 **PD 기준 준수 여부**를 반드시 마지막에 포함.

### Developer `[DEV]`
- Next.js/Prisma/API/UI 구현 담당.
- 구현 원칙:
  1) 요구사항을 “UI/데이터/권한/에러/로깅/테스트”로 분해  
  2) 영향 범위를 먼저 매핑(어떤 페이지/컴포넌트/API/스키마가 바뀌는지)  
  3) 최소 변경 + 리그레션 방지(기존 동작을 깨지 않기)  
  4) 로컬에서 동작 확인(필수)  
- Push/배포는 사용자 요청 시에만 수행.

### Tester `[QA]`
- 로컬 기반 테스트 설계/수행, 회귀/권한/경계 케이스 확인.
- “증거” 중심:
  - 재현 단계(steps), 기대 결과(expected), 실제 결과(actual), 스크린샷/로그 경로.
- 변경 시 최소한 아래를 항상 포함:
  - 비로그인/로그인, CUSTOMER/SELLER/ADMIN 롤별 접근 제한
  - API 401/403/409/500 경계 케이스
  - 데이터 저장/로드 정합성(특히 category/color/colorKey)

### Product Designer `[PD]`
- UI/UX 기준 정의(정보계층/타이포/간격/그리드/컴포넌트 상태/모션).
- “모호함 제거”가 핵심:
  - 폰트 크기/굵기/색상, padding/margin, divider 유무, 버튼 위치/행동 등 숫자로 명시.
- 산출물:
  - 화면별 구조도(텍스트 기반), 컴포넌트 규칙, Do/Don’t 리스트, QA 체크 포인트.

---

## 5) Round Output Format (SV 필수) `[SV]`
매 라운드 SV는 아래 포맷으로 보고한다.

1) **목표 요약**: 이번 라운드에서 무엇을 “끝내는지” (불필요한 확장 금지)  
2) **agent별 결론**: DEV/QA/PD가 각각 무엇을 결정/수행했는지 3~6줄 요약  
3) **변경 계획**: 파일 단위 변경 계획 + 영향 범위 + 롤/권한 영향  
4) **실행한 명령과 결과**: 로컬에서 실행한 명령/테스트 결과(필수)  
5) **diff 요약 + 확인 체크리스트**: 핵심 변경점 bullet + QA 체크리스트(완료/미완료)

---

## 6) UX policy snapshots (기준선) `[PD]` `[ALL]`

### A) 메인 피드: 2가지 보기 모드
- **Feed(인스타형)**: 카드 1개가 가로폭을 꽉 채우는 스크롤 피드.
  - 헤더(이미지 “바깥 상단”): 상점 프로필 원형 + 상점명 + (우측) … 메뉴
  - 이미지(4:5): full width, 고정 aspect.
  - 푸터(이미지 아래): 상품명 + 가격(좌), 액션(우: 즐겨찾기/공유)
- **List(당근형)**: 썸네일 좌 + 텍스트 우의 리스트.
- 토글 UI:
  - 햄버거 메뉴 상단에 `피드형 보기 | [ON/OFF]` 형태(작고 일관된 타이포).  
  - 토글은 “왔다갔다 큰 버튼” 금지. 다른 메뉴 타이포 스케일과 맞춘다.

### B) 상점(Seller) 페이지: 인스타 프로필 그리드
- 2가지 보기 모드(햄버거 메뉴 토글 연동):
  - **피드형**: 3열 빈틈없는 그리드(gap-1px), 이미지만.
  - **리스트형**: 3열 간격 그리드(gap-3, px-4), 이미지 + 상품명/가격.
- 프로필 영역:
  - 아바타(80px 원형) + 상점명/소개글/위치/타입 (가로 배치).
  - 자기 상점: "프로필 편집" + "상점관리" 버튼.
  - 타인 상점: "팔로우" + "이메일 문의/채팅 문의" 버튼.
  - 팔로워 수/리스트는 표시하지 않음.

### C) 카테고리 선택: Depth 탐색 + 최근
- 바텀시트에서 “대분류 → 중분류 → 소분류”로 **연속 진입**.
- 상위로 back 가능, breadcrumb 노출.
- 남/여만 보여주는 고정 메뉴 금지: 반드시 **하위로 들어가는 구조** 제공.

### D) 색상 선택: 즐겨찾기/최근/검색 + 색상별 이미지
- 탭: “나만의 색상 / 기본 색상”
- 기본 색상: 컬러 그룹 칩(예: 그레이/옐로우/레드 등) + 2열 리스트.
- 색상은 **사각형 swatch**(원형 금지).
- “색상별 이미지 설정”까지 이어지는 플로우(선택 색상 → 해당 색상 이미지 업로드/정렬/저장).

---

## 7) Testing policy (minimum bar) `[QA]` `[ALL]`
- 로컬에서 반드시 확인:
  - (1) 카테고리 바텀시트: depth 진입/뒤로/최근/저장값 반영
  - (2) 색상 바텀시트: 즐겨찾기/최근/검색/선택 저장
  - (3) 색상별 이미지: colorKey 저장/로드/편집/삭제
  - (4) 권한: SELLER만 상품 등록/수정 가능, ADMIN은 운영 UI만 접근 가능
- 테스트 문서는 `UI_PICKERS_TESTS.md`처럼 “TC-번호”로 관리.

---

## 8) When DB changes are allowed `[DEV]` `[SV]`
- 아래 중 하나면 스키마 변경 가능:
  1) 핵심 기능이 DB 없이 불가능(예: 팔로우 관계, colorKey)
  2) 운영/감사/권한에 필요한 영속 데이터
- 스키마 변경 시 필수:
  - 하위호환(기존 레코드 null 허용 등)
  - 마이그레이션/푸시 결과 기록
  - API/UI 연동 테스트

---

## 9) File/Module starting points (update with your repo structure) `[DEV]`
> SV는 실제 레포 구조에 맞춰 아래 경로를 최신화한다.

- 메뉴/햄버거: `components/Drawer.tsx`, `components/menu/MenuItem.tsx`, `components/menu/MenuSection.tsx`, `components/menu/MenuProfileRow.tsx`
- 메인 피드: `app/page.tsx`, `components/ProductCard.tsx`, `components/HomeClientView.tsx`, `components/HomeCarrotList.tsx`
- 셀러 상점: `app/s/[sellerId]/page.tsx`, `components/ProductGrid.tsx`, `components/SellerShopHeader.tsx`
- 상품 폼: `app/seller/products/new`, `.../edit`, `components/ProductForm.tsx`
- 카테고리/색상 피커: `components/CategoryPickerSheet.tsx`, `components/ColorPickerSheet.tsx`, `components/ColorImageManager.tsx`
- 셀러 신청: `app/apply/seller/page.tsx`
- Prisma schema: `prisma/schema.prisma`
- Role helpers: `lib/roles.ts`, `lib/roleGuards.ts`, `lib/authTypes.ts`

---

## 10) Documentation freshness `[SV]` `[ALL]`
- 이 파일(`MIKRO_CLAUDE.md`)은 "현재 운영 규칙/UX 기준/권한 원칙"의 단일 진실원.
- 규칙/구조가 바뀌면 **코드보다 먼저** 문서를 업데이트하고 시작한다(상호 불일치 금지).
