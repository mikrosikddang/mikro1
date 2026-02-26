# 판매자 모드 토글 TC (Seller Mode Toggle Test Cases)

> 대상: `SellerModeToggle`, `BottomTab`, `Drawer`, `lib/uiPrefs.ts`
> 작성: QA | 상태: **코드 리뷰 검증 완료**
> 기준: PD QA 체크포인트 CP-1 ~ CP-13 + 추가 검증

---

## 검증 요약

| 카테고리 | TC 수 | PASS | FAIL | WARN |
|----------|-------|------|------|------|
| 토글 표시 조건 | 5 | 5 | 0 | 0 |
| 토글 스타일/UX | 5 | 4 | 0 | 1 |
| ON/OFF 동작 | 4 | 4 | 0 | 0 |
| BottomTab 전환 | 5 | 4 | 1 | 0 |
| Drawer 메뉴 순서 | 3 | 3 | 0 | 0 |
| localStorage | 3 | 3 | 0 | 0 |
| 이벤트 동기화 | 3 | 3 | 0 | 0 |
| 구매 기능 비차단 | 1 | 1 | 0 | 0 |
| **합계** | **29** | **27** | **1** | **1** |

---

## 발견된 버그 / 이슈 목록

| ID | 심각도 | 위치 | 설명 |
|----|--------|------|------|
| BUG-T1 | **MEDIUM** | `BottomTab.tsx:58-60` | `/seller` 경로에서 sellerMode가 **아닌** 경우 BottomTab 숨김. 하지만 사용자가 직접 URL로 `/seller` 접근 시(토글 OFF 상태) BottomTab이 사라져 네비게이션 불가 |
| WARN-T1 | **LOW** | `SellerModeToggle.tsx:59` vs `HomeFeedViewToggle.tsx:48` | 외부 컨테이너 margin 불일치: SellerModeToggle은 `mt-1 mb-3`, HomeFeedViewToggle은 `mt-2 mb-1`. 시각적 간격 비대칭 |

---

## 1. 토글 표시 조건

### CP-01 / TC-T01: SELLER_ACTIVE만 토글 표시 — PASS
- **steps**:
  1. SELLER_ACTIVE 역할 계정으로 로그인
  2. Drawer 열기
- **expected**:
  - "판매자 모드" 토글이 표시됨
- **actual**: PASS
  - `SellerModeToggle.tsx:19` — `isSellerActive(session.role)` 체크 (SELLER_ACTIVE만 true)
  - `SellerModeToggle.tsx:26` — `if (!isActive) return null` → SELLER_ACTIVE 아니면 렌더링 안 함
  - `lib/roles.ts:35-37` — `isSellerActive()` = `role === "SELLER_ACTIVE"` (SELLER_PENDING, CUSTOMER, ADMIN 제외)

### CP-02 / TC-T02: CUSTOMER 역할 시 토글 미표시 — PASS
- **steps**:
  1. CUSTOMER 역할 계정으로 로그인
  2. Drawer 열기
- **expected**:
  - "판매자 모드" 토글 없음
- **actual**: PASS
  - `isSellerActive("CUSTOMER")` = false → `return null`

### TC-T03: SELLER_PENDING 역할 시 토글 미표시 — PASS
- **steps**:
  1. SELLER_PENDING 역할 계정으로 로그인
  2. Drawer 열기
- **expected**:
  - "판매자 모드" 토글 없음 (승인 전)
- **actual**: PASS
  - `isSellerActive("SELLER_PENDING")` = false → `return null`

### CP-04 / TC-T04: ADMIN 역할 시 토글 미표시 — PASS
- **steps**:
  1. ADMIN 역할 계정으로 로그인
  2. Drawer 열기
- **expected**:
  - "판매자 모드" 토글 없음 (ADMIN은 판매자 아님)
- **actual**: PASS
  - `isSellerActive("ADMIN")` = false (`lib/roles.ts:36` — `role === "SELLER_ACTIVE"` only)
  - `SellerModeToggle.tsx:26` — `return null`

### CP-13 / TC-T05: 비로그인 시 토글 미표시 — PASS
- **steps**:
  1. 로그아웃 상태
  2. Drawer 열기
- **expected**:
  - "판매자 모드" 토글 없음
- **actual**: PASS
  - `SellerModeToggle.tsx:19` — `session` null → `isActive = false` → `return null`

---

## 2. 토글 스타일/UX

### CP-03 / TC-T09: SELLER_ACTIVE 기본 OFF 확인 — PASS
- **steps**:
  1. SELLER_ACTIVE 계정, localStorage에 sellerMode 미설정 (초기 상태)
  2. Drawer 열기
- **expected**:
  - 토글이 OFF 상태 (기본값 buyer)
- **actual**: PASS
  - `uiPrefs.ts:62` — `getSellerMode()` 기본 반환값 `"buyer"`
  - `SellerModeToggle.tsx:16` — `useState<SellerMode>("buyer")` 초기값
  - localStorage에 값 없으면 → "buyer" → `isOn = false` → OFF 상태 스위치 렌더

### CP-05 / TC-T10: HomeFeedViewToggle과 동일 스타일 — WARN (WARN-T1)
- **steps**:
  1. SELLER_ACTIVE 로그인
  2. Drawer 열기
  3. "피드형 보기" 토글과 "판매자 모드" 토글 스타일 비교
- **expected**:
  - 동일한 높이, 배경, 보더, 스위치 크기/색상
- **actual**: WARN — **기능 동일, margin 불일치**
  - **동일한 부분**:
    - 버튼: `w-full h-10 px-3 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between active:bg-gray-100`
    - 라벨: `text-[14px] font-medium text-gray-700`
    - 스위치 트랙: `w-9 h-5 rounded-full`, ON=`bg-black`, OFF=`bg-gray-300`
    - 스위치 노브: `w-4 h-4 rounded-full bg-white shadow-sm`, ON=`translate-x-[18px]`, OFF=`translate-x-0.5`
  - **불일치**:
    - HomeFeedViewToggle: `mx-4 mt-2 mb-1` (`:48`)
    - SellerModeToggle: `mx-4 mt-1 mb-3` (`:59`)
    - 위쪽 margin 1px 차이 + 아래쪽 margin 2px 차이 → 시각적 비대칭
    - **의도적일 수 있음**: SellerModeToggle이 아래에 위치하므로 메뉴 섹션과의 간격(mb-3) 확보 가능

### CP-04 / TC-T11: 토글 라벨 텍스트 — PASS
- **steps**:
  1. Drawer 열기
  2. 토글 라벨 확인
- **expected**:
  - "판매자 모드" 텍스트
- **actual**: PASS
  - `SellerModeToggle.tsx:65-67` — `"판매자 모드"`

### TC-T12: SSR hydration 방지 (skeleton) — PASS
- **steps**:
  1. 페이지 최초 로드 시 토글 영역 확인
- **expected**:
  - 마운트 전 빈 skeleton 표시 (hydration mismatch 방지)
- **actual**: PASS
  - `SellerModeToggle.tsx:50-56` — `!mounted` 시 빈 `div` 반환 (`h-10 px-3 rounded-2xl bg-gray-50 border border-gray-100`)
  - `HomeFeedViewToggle.tsx:39-44` — 동일 패턴 적용
  - `mounted` 상태는 `useEffect`에서 설정 → SSR 시 false

### TC-T13: ON/OFF 스위치 시각 피드백 — PASS
- **steps**:
  1. 토글 OFF 상태에서 스위치 색상 확인
  2. 토글 ON으로 변경 후 스위치 색상 확인
- **expected**:
  - OFF: 회색 트랙 + 왼쪽 노브
  - ON: 검정 트랙 + 오른쪽 노브
- **actual**: PASS
  - OFF: `bg-gray-300` 트랙, `translate-x-0.5` 노브
  - ON: `bg-black` 트랙, `translate-x-[18px]` 노브
  - `transition-colors` + `transition-transform` 애니메이션 적용

---

## 3. ON/OFF 동작

### CP-05 / TC-T20: ON 시 /seller 이동 — PASS
- **steps**:
  1. 토글 OFF 상태
  2. 토글 클릭 (ON으로)
- **expected**:
  - `/seller` 페이지로 이동
  - Drawer 닫힘
- **actual**: PASS
  - `SellerModeToggle.tsx:41-42` — `newMode === "seller"` → `router.push("/seller")`
  - `SellerModeToggle.tsx:47` — `onToggle?.()` 호출 → Drawer의 `onClose` 실행
  - `Drawer.tsx:180` — `<SellerModeToggle onToggle={onClose} />`

### CP-06 / TC-T21: OFF 시 / 이동 — PASS
- **steps**:
  1. 토글 ON 상태
  2. 토글 클릭 (OFF로)
- **expected**:
  - `/` (홈) 페이지로 이동
  - Drawer 닫힘
- **actual**: PASS
  - `SellerModeToggle.tsx:43-44` — `newMode !== "seller"` → `router.push("/")`
  - `onToggle?.()` → Drawer 닫힘

### TC-T22: 토글 상태 변경 시 CustomEvent 발행 — PASS
- **steps**:
  1. 토글 클릭
- **expected**:
  - `sellerModeChange` CustomEvent가 발행되어 BottomTab/Drawer 동기화
- **actual**: PASS
  - `SellerModeToggle.tsx:35-39` — `window.dispatchEvent(new CustomEvent("sellerModeChange", { detail: { mode: newMode } }))`
  - `BottomTab.tsx:22-25` — `sellerModeChange` 이벤트 리스너에서 상태 업데이트
  - `Drawer.tsx:42-44` — 동일 이벤트 리스너에서 `sellerModeState` 업데이트

### TC-T23: localStorage 저장 — PASS
- **steps**:
  1. 토글 클릭
- **expected**:
  - `sellerMode` 값이 localStorage에 저장됨
- **actual**: PASS
  - `SellerModeToggle.tsx:33` — `setSellerMode(newMode)` 호출
  - `uiPrefs.ts:68-76` — `localStorage.setItem("sellerMode", mode)` 실행
  - try-catch로 에러 핸들링

---

## 4. BottomTab 전환

### CP-07 / TC-T30: 구매자 모드 BottomTab — PASS
- **steps**:
  1. 판매자 모드 OFF 상태
  2. BottomTab 확인
- **expected**:
  - 홈 / 관심 / 뉴스(또는 상품올리기) / 채팅 / MY
- **actual**: PASS
  - `BottomTab.tsx:30-38` — `buyerTabs`:
    - 홈 (`/`), 관심 (`/wishlist`), 상품올리기 (`/seller/products/new`, SELLER_ACTIVE일 때) 또는 뉴스 (`/news`), 채팅 (`/chat`), MY (`/my`)
  - `BottomTab.tsx:50` — `sellerMode ? sellerTabs : buyerTabs`

### CP-08 / TC-T31: 판매자 모드 BottomTab — PASS
- **steps**:
  1. 판매자 모드 ON 상태
  2. BottomTab 확인
- **expected**:
  - 대시보드 / 상품관리 / 상품올리기 / 주문관리 / 내 상점
- **actual**: PASS
  - `BottomTab.tsx:40-48` — `sellerTabs`:
    - 대시보드 (`/seller`), 상품관리 (`/seller/products`), 상품올리기 (`/seller/products/new`), 주문관리 (`/seller/orders`), 내 상점 (`/s/${session.userId}`)

### CP-09 / TC-T32: /seller에서 BottomTab 표시 (판매자 모드) — PASS
- **steps**:
  1. 판매자 모드 ON
  2. `/seller` 페이지에서 BottomTab 확인
- **expected**:
  - 판매자 BottomTab 표시됨
- **actual**: PASS
  - `BottomTab.tsx:57-60` — `/seller` 경로 + `sellerMode === false`일 때만 숨김
  - sellerMode ON → 조건 불일치 → BottomTab 렌더링

### TC-T33: /seller에서 BottomTab 숨김 (구매자 모드) — FAIL (BUG-T1)
- **steps**:
  1. 판매자 모드 OFF 상태
  2. 직접 URL로 `/seller` 접근
- **expected**:
  - 구매자 BottomTab 표시 또는 적절한 처리
- **actual**: **FAIL**
  - `BottomTab.tsx:58-60` — `pathname.startsWith("/seller") && !sellerMode` → `return null`
  - 판매자 모드 OFF인데 `/seller` 경로면 BottomTab 완전 숨김
  - **문제**: 사용자가 직접 URL로 `/seller`에 접근하거나, Drawer 판매자 메뉴에서 대시보드 클릭 시 (sellerMode OFF 상태) BottomTab이 사라져 네비게이션 불가
  - **재현 경로**: Drawer → 판매자 섹션(sellerMode OFF일 때도 표시됨, Drawer:220-227) → "대시보드" 클릭 → `/seller` 이동 → BottomTab 없음
  - **권장**: (1) `/seller` 접근 시 sellerMode 자동 ON, 또는 (2) sellerMode OFF여도 `/seller` 경로에서는 구매자 BottomTab 표시

### TC-T34: /admin에서 BottomTab 숨김 — PASS
- **steps**:
  1. ADMIN 계정으로 `/admin` 접근
- **expected**:
  - BottomTab 숨김
- **actual**: PASS
  - `BottomTab.tsx:53-55` — `pathname.startsWith("/admin")` → `return null`

---

## 5. Drawer 메뉴 순서 변경

### CP-10 / TC-T40: 판매자 모드 ON 시 메뉴 순서 — PASS
- **steps**:
  1. 판매자 모드 ON
  2. Drawer 열기
  3. 메뉴 섹션 순서 확인
- **expected**:
  - 피드형 보기 → 판매자 모드 → **판매자** → 둘러보기 → 정보
- **actual**: PASS
  - `Drawer.tsx:179` — HomeFeedViewToggle
  - `Drawer.tsx:180` — SellerModeToggle
  - `Drawer.tsx:193-200` — `sellerMode && isSeller` → 판매자 섹션 (둘러보기 **위**)
  - `Drawer.tsx:203-217` — 둘러보기 섹션
  - `Drawer.tsx:220-227` — `!sellerMode` 조건 → 렌더링 안 됨 (판매자 모드 ON이므로)
  - `Drawer.tsx:240-251` — 정보 섹션

### CP-11 / TC-T41: 판매자 모드 OFF 시 메뉴 순서 — PASS
- **steps**:
  1. 판매자 모드 OFF
  2. Drawer 열기
  3. 메뉴 섹션 순서 확인
- **expected**:
  - 피드형 보기 → 판매자 모드 → 둘러보기 → **판매자** → 정보
- **actual**: PASS
  - `Drawer.tsx:193-200` — `sellerMode` false → 렌더링 안 됨
  - `Drawer.tsx:203-217` — 둘러보기 섹션
  - `Drawer.tsx:220-227` — `!sellerMode && isSeller` → 판매자 섹션 (둘러보기 **아래**)
  - 판매자 섹션 내용 동일: 내 상점 보기, 대시보드, 상품 관리, 주문 관리

### TC-T42: 판매자 메뉴 내용 일관성 — PASS
- **steps**:
  1. 판매자 모드 ON/OFF 전환하며 판매자 메뉴 항목 비교
- **expected**:
  - 두 경우 모두 동일한 메뉴 항목
- **actual**: PASS
  - ON (`:194-199`): 내 상점 보기, 대시보드, 상품 관리, 주문 관리
  - OFF (`:221-226`): 내 상점 보기, 대시보드, 상품 관리, 주문 관리
  - 항목 완전 동일, 위치만 변경

---

## 6. localStorage 저장/복원

### CP-12 / TC-T50: 페이지 새로고침 시 상태 유지 — PASS
- **steps**:
  1. 판매자 모드 ON으로 전환
  2. 페이지 새로고침
  3. Drawer 열기
- **expected**:
  - 토글이 ON 상태로 복원됨
- **actual**: PASS
  - `uiPrefs.ts:50-63` — `getSellerMode()`: localStorage에서 `"sellerMode"` 읽기
  - `SellerModeToggle.tsx:22` — `useEffect`에서 `getSellerMode()` 호출 → 상태 복원
  - `BottomTab.tsx:19` — 동일하게 `getSellerMode()` 호출 → 탭 세트 복원

### TC-T51: SSR 안전성 — PASS
- **steps**:
  1. 서버사이드 렌더링 시 localStorage 접근 안전성 확인
- **expected**:
  - `typeof window === "undefined"` 체크로 SSR 에러 방지
- **actual**: PASS
  - `uiPrefs.ts:51` — `getSellerMode()`: `typeof window === "undefined"` → `return "buyer"`
  - `uiPrefs.ts:69` — `setSellerMode()`: `typeof window === "undefined"` → `return`
  - try-catch로 localStorage 접근 실패 시에도 에러 전파 차단

### TC-T52: localStorage 에러 핸들링 — PASS
- **steps**:
  1. 시크릿 모드 또는 localStorage 비활성화 환경에서 접근
- **expected**:
  - 에러 없이 기본값 "buyer" 반환
- **actual**: PASS
  - `uiPrefs.ts:58-60` — try-catch 내 `console.error` 후 `return "buyer"` (기본값)
  - `uiPrefs.ts:72-74` — set 시에도 try-catch로 에러 흡수

---

## 7. 이벤트 동기화

### CP-13 / TC-T60: BottomTab ↔ SellerModeToggle 동기화 — PASS
- **steps**:
  1. Drawer에서 토글 전환
  2. BottomTab 즉시 변경 확인
- **expected**:
  - CustomEvent로 실시간 동기화
- **actual**: PASS
  - `SellerModeToggle.tsx:36-38` — `sellerModeChange` CustomEvent 발행
  - `BottomTab.tsx:22-25` — 이벤트 리스너에서 `setSellerMode(detail.mode === "seller")` 업데이트
  - 동일 이벤트명 `"sellerModeChange"`, 동일 payload 구조 `{ detail: { mode } }`

### TC-T61: Drawer 내부 상태 동기화 — PASS
- **steps**:
  1. 토글 전환 후 Drawer 다시 열기
  2. 메뉴 순서 변경 확인
- **expected**:
  - Drawer 내부 `sellerMode` 상태가 CustomEvent로 동기화
- **actual**: PASS
  - `Drawer.tsx:37-48` — `useEffect`에서 초기값 로드 + `sellerModeChange` 이벤트 리스너
  - 이벤트 수신 시 `setSellerModeState(detail.mode === "seller")` → 메뉴 순서 즉시 반영
  - cleanup: `removeEventListener` 처리됨

### TC-T62: 이벤트 리스너 cleanup — PASS
- **steps**:
  1. 컴포넌트 언마운트 시 이벤트 리스너 정리 확인
- **expected**:
  - 메모리 누수 없음
- **actual**: PASS
  - `BottomTab.tsx:27` — `return () => window.removeEventListener(...)`
  - `Drawer.tsx:47` — `return () => window.removeEventListener(...)`
  - 두 컴포넌트 모두 cleanup 함수에서 리스너 제거

---

## 8. 구매 기능 비차단

### CP-11 / TC-T70: 판매자 모드에서 구매 기능 차단 없음 — PASS
- **steps**:
  1. SELLER_ACTIVE 계정, 판매자 모드 ON
  2. 구매 관련 기능 (홈 피드, 상품 상세, 관심 목록 등) 접근 가능 여부 확인
- **expected**:
  - 판매자 모드 ON이어도 구매 기능 차단 없음
- **actual**: PASS
  - `sellerMode` 상태는 BottomTab 탭 세트 전환과 Drawer 메뉴 순서에만 영향
  - 구매 경로 (`/`, `/wishlist`, `/chat`, `/my`, 상품 상세 등)에 sellerMode 기반 차단 로직 없음
  - `BottomTab.tsx` — 판매자 탭에도 "내 상점" 링크가 있어 상점 페이지 접근 가능
  - sellerMode는 순수 UI 프리퍼런스로, 라우트 가드나 API 권한에 영향 없음

---

## 토글 간격 확인 (CP-12)

### CP-12 / TC-T71: 두 토글 간 간격 4px — WARN (WARN-T1)
- **steps**:
  1. Drawer에서 HomeFeedViewToggle과 SellerModeToggle 사이 간격 확인
- **expected**:
  - 두 토글 사이 간격 4px (PD 스펙)
- **actual**: WARN — 간격 계산상 약 8px
  - HomeFeedViewToggle: `mx-4 mt-2 mb-1` → 하단 margin 4px (mb-1)
  - SellerModeToggle: `mx-4 mt-1 mb-3` → 상단 margin 4px (mt-1)
  - 총 간격: mb-1(4px) + mt-1(4px) = **8px** (PD 스펙 4px과 불일치)
  - **권장**: SellerModeToggle의 `mt-1`을 `mt-0`으로 변경하면 4px 달성

---

## 아키텍처 코드 리뷰 소견

### 잘 구현된 부분
1. **역할 분리**: `isSellerActive()` 헬퍼 사용으로 문자열 비교 없음 (플레이북 준수)
2. **SSR 안전**: `typeof window` 체크 + `mounted` 상태 + skeleton 패턴
3. **이벤트 기반 동기화**: CustomEvent로 BottomTab/Drawer/Toggle 3자 실시간 동기화
4. **localStorage 추상화**: `uiPrefs.ts`에 get/set 집중, try-catch 에러 핸들링
5. **Drawer 메뉴 조건부 배치**: 동일 컨텐츠를 `sellerMode` 조건으로 위치만 변경 (코드 중복이지만 가독성 확보)

### 개선 권장
1. **BUG-T1**: `/seller` 경로 직접 접근 시 BottomTab 숨김 문제 — sellerMode 자동 ON 또는 fallback BottomTab 필요
2. **WARN-T1**: 토글 2개의 margin 통일 (또는 의도적 차이라면 주석으로 명시)
3. **코드 중복**: Drawer에서 판매자 메뉴 블록이 2번 정의됨 (`:193-200`, `:220-227`). 별도 변수/컴포넌트로 추출하면 유지보수 개선

---

**TC 총 개수: 29개** (CP-1~CP-13 전체 커버 + 추가 검증)
**PASS: 27 / FAIL: 1 / WARN: 1**
**발견 버그: 1건 (MEDIUM), 경고: 1건 (LOW)**
