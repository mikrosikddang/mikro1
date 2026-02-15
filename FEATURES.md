# mikro — 기능 명세서

> 동대문 패션 모바일 마켓플레이스 MVP (Next.js App Router)
> 최종 업데이트: 2026-02-13

---

## 테스트 계정

| 역할 | 아이디 | 비밀번호 | 설명 |
|------|--------|---------|------|
| 고객 | `1` | `1` | CUSTOMER 역할 (email: mvp1@mikro.local, id: mvp-customer-1) |
| 판매자 | `s` | `s` | SELLER 역할 (email: seller1@mikro.local, id: mvp-seller-1) |

---

## 공통 레이아웃

### TopBar (상단바)
- **mikro** 로고 → 홈(`/`)으로 이동
- 검색바 (placeholder, 기능 미구현)
- 햄버거 메뉴 → Drawer 열기

### BottomTab (하단 탭)
- **홈** (`/`) — 상품 피드
- **관심** (`/wishlist`) — 찜 목록
- **뉴스** (`/news`) — placeholder
- **채팅** (`/chat`) — placeholder (로그인 필요)
- **MY** (`/my`) — 마이페이지

### Drawer (사이드 메뉴)
- 로그인 상태 표시 (판매자/고객/비로그인)
- 카테고리: 바지, 아우터, 반팔티, 긴팔티, 니트
- 브랜드 보기 → `/brands`
- 판매자 센터 → `/seller` (판매자만 노출)
- 이용약관, 개인정보처리방침
- 입점 안내 → `/apply`
- 페이지 이동 시 자동 닫힘

### Container
- 최대 너비 420px, 중앙 정렬, 모바일 퍼스트

---

## 페이지별 기능

### 1. 홈 피드 — `/`

| 항목 | 설명 |
|------|------|
| 카테고리 필터 | 상단 chip 스크롤: 전체, 바지, 아우터, 반팔티, 긴팔티, 니트 |
| 상품 카드 | 세로 나열, 각 카드에 이미지 캐러셀 + 상품명 + 가격 + 상점명 |
| 이미지 캐러셀 | MAIN 이미지 횡스크롤 스와이프 (scroll-snap), 도트 인디케이터 |
| 찜 버튼 | 카드 우상단 하트 아이콘, localStorage 기반 토글 |
| 데이터 | `isActive=true`, `isDeleted=false`인 상품만 표시 |
| 정렬 | 최신순 (createdAt desc), 최대 20개 |

**쿼리 파라미터**: `?category=pants` → DB의 "바지" 카테고리 필터

---

### 2. 상품 상세 — `/p/[id]`

| 항목 | 설명 |
|------|------|
| 메인 이미지 | `ImageCarousel` — MAIN 이미지 횡스크롤, 3:4 비율 |
| 판매자 정보 | 아바타 + 상점명, 클릭 시 `/s/[sellerId]`로 이동 |
| 상품명 | 20px bold |
| 가격 | 24px extrabold, 원화 포맷 (₩19,000) |
| 품절 뱃지 | 전체 variant stock 합계 0이면 빨간 "품절" 뱃지 |
| 사이즈 선택 | 각 variant를 pill로 표시: `S (10)`, `M (8)`, `L (6)` / 재고 0이면 취소선 |
| 수량 선택 | +/- 버튼으로 수량 조절 (최소 1, 최대 재고량) |
| 상품 설명 | `description` 텍스트 (있을 때만 표시) |
| 상세 이미지 | CONTENT 이미지들 세로 스택 (있을 때만 표시) |
| 장바구니 담기 | "장바구니 담기" 버튼 (사이즈 선택 필수, CUSTOMER 로그인 필요) |
| 장바구니 이동 | "장바구니" 버튼 → `/cart` 이동 |
| 찜 버튼 | 하트 아이콘 (detail variant, 52x52) |

**장바구니 담기 플로우:**
1. 사이즈/수량 선택 → "장바구니 담기" 클릭
2. 미로그인 시 → `/login?next=/p/[id]` 리다이렉트
3. SELLER 역할 시 → 403 에러
4. 성공 시 → "장바구니에 담았습니다" 메시지 표시
5. 중복 variant → 수량 증가로 처리

---

### 3. 판매자 상점 — `/s/[sellerId]`

| 항목 | 설명 |
|------|------|
| 상점 헤더 | 아바타 + 상점명 + 위치 정보 (상가·층·호수) + 카테고리 타입 |
| 상품 수 | "상품 N개" 표시 |
| 상품 목록 | `isActive=true`, `isDeleted=false`인 해당 판매자 상품 카드 나열 |

---

### 4. 로그인 — `/login`

| 항목 | 설명 |
|------|------|
| 로그인 폼 | 아이디 + 비밀번호 입력 |
| MVP 테스트 계정 | 하단에 "고객 (1/1)", "판매자 (s/s)" 버튼 → 자동 입력 |
| 인증 방식 | HMAC-SHA256 서명된 HttpOnly 쿠키 (`mikro_session`) |
| 쿠키 만료 | 7일 |
| 리다이렉트 | `?next=` 파라미터로 로그인 후 이동할 페이지 지정 |

---

### 5. MY 페이지 — `/my`

| 항목 | 설명 |
|------|------|
| 프로필 | 로그인: 역할(판매자/고객) + userId 일부 표시 + 로그아웃 버튼 |
| 비로그인 | "게스트" 표시 → 로그인 페이지로 이동 |
| 메뉴 | 주문내역, 관심목록, 판매자 센터(판매자만), 사업자 정보, 이용약관, 개인정보처리방침, 환불·교환·반품 정책 |

---

### 6. 관심목록 (찜) — `/wishlist`

| 항목 | 설명 |
|------|------|
| 저장 방식 | localStorage (`mikro_wishlist` 키, productId 배열) |
| 데이터 로딩 | `POST /api/products/by-ids`로 상품 정보 일괄 조회 |
| 실시간 동기화 | `wishlist-change` 커스텀 이벤트로 다른 탭/컴포넌트와 동기화 |
| 빈 상태 | "관심 상품이 없어요" + 홈으로 가기 버튼 |

---

### 7. 브랜드 목록 — `/brands`

| 항목 | 설명 |
|------|------|
| 목록 | 승인된(`APPROVED`) 판매자 프로필 전체 표시 |
| 카드 | 2열 그리드, 아바타 + 상점명 + 타입 + 위치 |
| 클릭 | `/s/[sellerId]`로 이동 |

---

### 8. 입점 안내 — `/apply`

| 항목 | 설명 |
|------|------|
| 입점 조건 | 사업자등록증, 동대문 매장, 자체 상품 보유 |
| 신청 방법 | 문의 접수 → 서류 제출 → 심사/승인 (3일 이내) |
| 문의 | partner@mikro.kr |

---

### 9. 장바구니 — `/cart`

> CUSTOMER 역할 로그인 필수. SELLER 접근 시 403. 미로그인 시 `/login?next=/cart` 리다이렉트.

| 항목 | 설명 |
|------|------|
| 저장 방식 | 데이터베이스 (CartItem 테이블), userId + variantId 조합 unique |
| 자동 정리 | 페이지 로드 시 `isDeleted=true` 또는 `isActive=false` 상품 자동 삭제 (트랜잭션) |
| 상품 카드 | 이미지 + 상품명 + 사이즈 + 재고 + 단가 + 수량 조절 + 삭제 버튼 |
| 수량 조절 | +/- 버튼으로 즉시 PATCH 요청, 재고 초과 시 409 에러 + 롤백 |
| 옵티미스틱 업데이트 | UI 즉시 변경 후 실패 시 이전 상태로 롤백 |
| 재고 부족 경고 | "재고: N개 (최대 주문 가능)" 표시 |
| 전체 삭제 | "전체 삭제" 버튼 → DELETE /api/cart 호출 |
| 결제하기 | "결제하기" 버튼 → `/checkout` 이동 |
| 빈 상태 | "장바구니가 비어 있습니다" + "쇼핑 계속하기" 버튼 |

---

### 10. 주문/결제 — `/checkout`

> CUSTOMER 역할 로그인 필수. SELLER 접근 시 리다이렉트.

| 섹션 | 설명 |
|------|------|
| **배송지** | Address 테이블에서 기본 배송지 로드, "배송지 변경" 버튼 (준비중), 등록된 배송지 없으면 "배송지 추가" 안내 |
| **주문 상품** | 판매자별로 그룹핑 표시 (각 그룹: 상점명 + 상품 목록 + 소계 + 배송비) |
| **배송비 계산** | 판매자별 정책 적용: 기본 shippingFeeKrw=3000, freeShippingThreshold=50000, 소계 ≥ threshold이면 배송비 0 |
| **총 결제 금액** | 상품 합계 + 배송비 합계 = 총 결제 금액 |
| **배송비 안내** | "배송비는 판매자별 정책이 적용됩니다" + 자세히 보기 링크 → `/policy/returns` |
| **정책 동의** | 결제 버튼 바로 위에 "결제 진행 시 이용약관, 개인정보처리방침, 환불·교환·반품 정책에 동의한 것으로 간주됩니다" 안내 |
| **결제하기 버튼** | "결제하기 (테스트)" 클릭 시 → POST /api/orders로 주문 생성 |
| **결제 모달** | 테스트 환경 안내 + "결제 성공" / "결제 실패" 선택 |

**주문 생성 플로우:**
1. 배송지 선택 확인 → POST /api/orders (items + address)
2. 판매자별로 Order 분할 생성 (status=PENDING, expiresAt=now+30분)
3. 각 Order에 배송지 스냅샷 저장 (shipToName/Phone/Zip/Addr1/Addr2)
4. 각 Order에 가격 스냅샷 저장 (itemsSubtotalKrw, shippingFeeKrw, totalPayKrw)
5. 생성된 orderIds 배열 반환

**결제 시뮬레이션 플로우:**
- **성공**: POST /api/payments/simulate → 원자적 재고 차감 + Order.status=PAID + Payment.status=DONE → 장바구니 삭제 → `/orders/success?ids=...` 리다이렉트
- **실패**: POST /api/payments/simulate-fail → Payment.status=FAILED, Order.status=PENDING 유지 → 에러 메시지 표시
- **만료**: 주문 30분 경과 시 410 ORDER_EXPIRED 에러 → "주문 시간이 만료되었습니다" 안내

---

### 11. 주문 내역 — `/orders`

> CUSTOMER 역할 로그인 필수. SELLER 접근 시 "접근 권한이 없습니다" 안내.

| 항목 | 설명 |
|------|------|
| 데이터 | buyerId로 필터링, 최신순 정렬 (createdAt desc) |
| 주문 카드 | 상점명 + 주문번호 + 상태 뱃지 + 결제 금액 + 주문일 + "상세보기" 버튼 |
| 상태 뱃지 | PAID(초록 결제완료), PENDING(노랑 대기중), CANCELLED/CANCELED(빨강 취소됨), PREPARING(파랑 준비중), SHIPPING(보라 배송중), DELIVERED(회색 배송완료) |
| 상세보기 | `/orders/[id]` 이동 |
| 빈 상태 | "주문 내역이 없습니다" + "홈으로 가기" 버튼 |

---

### 12. 주문 상세 — `/orders/[id]`

> CUSTOMER 역할 로그인 필수. 본인 주문만 조회 가능 (buyerId 검증).

| 섹션 | 설명 |
|------|------|
| 헤더 | 주문번호 + 상태 뱃지 |
| 판매자 정보 | 상점명 표시 |
| 주문 상품 | 각 OrderItem 표시 (상품명 + 사이즈 + 수량 + 단가 + 소계) |
| 배송지 | shipToName + shipToPhone + shipToZip + shipToAddr1 + shipToAddr2 |
| 금액 정보 | 상품 합계(itemsSubtotalKrw) + 배송비(shippingFeeKrw) + 총 결제금액(totalPayKrw) |
| 주문 일시 | createdAt 표시 |

---

### 13. 주문 완료 — `/orders/success`

> CUSTOMER 역할 로그인 필수. 쿼리 파라미터 `?ids=id1,id2,...`로 다중 주문 표시.

| 항목 | 설명 |
|------|------|
| 헤더 | "주문이 완료되었습니다" + "판매자별로 주문이 생성되었습니다" 안내 |
| 주문 카드 | 각 Order별로 카드 표시 (상점명 + 주문번호 + 상태 + 주문 상품 목록 + 가격 정보) |
| 주문 상품 | 상품명 + 사이즈 + 수량 + 소계 |
| 가격 정보 | 상품 합계 + 배송비 + 총 결제금액 |
| 주문 상세 버튼 | `/orders/[id]` 이동 |
| 홈으로 버튼 | `/` 이동 |

---

### 14. 뉴스 — `/news`

placeholder ("아직 등록된 소식이 없어요")

---

### 15. 채팅 — `/chat`

placeholder ("준비 중인 기능입니다"), 로그인 필요

---

### 16. 이용약관 — `/policy/terms`

5개 조항: 목적, 정의, 약관의 효력, 서비스의 제공, 면책조항

---

### 12. 개인정보처리방침 — `/policy/privacy`

8개 섹션: 수집 항목, 수집·이용 목적, 보유 기간, 제3자 제공, 개인정보 처리의 위탁, 정보주체의 권리·의무 및 행사 방법, 개인정보 보호책임자 및 고충처리, 개인정보처리방침 변경

**주요 내용:**
- 수집 항목: 회원가입 시(ID/PW/유형), 주문 시(수령인/연락처/주소), 판매자 입점 시(상호/사업자번호), 자동 수집(IP/쿠키)
- 처리 위탁: AWS (서버 운영), Neon Database (DB 호스팅)
- 정보주체 권리: 열람/정정/삭제/처리정지 요구 가능, 고객센터 이메일(mikrobrand25@gmail.com) 또는 개인정보보호 이메일(mikrodataprotection@gmail.com)로 행사
- 고충처리: 개인정보침해신고센터, 개인정보분쟁조정위원회, 대검찰청, 경찰청 연락처 안내

---

### 13. 환불·교환·반품·배송 정책 — `/policy/returns`

7개 섹션: 배송, 배송비 정책, 교환·반품 가능 기간, 교환·반품 불가 사유, 환불 처리, 문의 채널, 정책 적용 기준

**주요 내용:**
- 배송: 영업일 기준 1~3일 출고, 출고 후 1~2일 배송
- 배송비: 판매자별 정책 적용 (기본: 50,000원 미만 3,000원, 이상 무료)
- 교환·반품: 수령 후 7일 이내 신청 가능
- 불가 사유: 택 제거, 착용 흔적, 포장 훼손, 주문 제작, 수령 후 7일 경과
- 환불: 취소/반품 승인 후 영업일 3~7일 이내 처리
- **정책 적용 기준**: 시행일 이후 주문 건부터 적용, 이전 주문은 주문 당시 정책 적용, 불리한 내용 소급 적용 금지

---

### 14. 사업자 정보 — `/info`

**고객센터:**
- 이메일: mikrobrand25@gmail.com
- 운영 시간: 평일 10:00 - 18:00 (주말 및 공휴일 휴무)

**개인정보 보호 책임:**
- 이메일: mikrodataprotection@gmail.com

**사업자 정보:**
- 상호: 미크로
- 대표자: 김동현
- 사업자등록번호: 443-65-00701
- 통신판매업 신고번호: 2025-서울구로-0131
- OFFICE: 93, Saemal-ro, Guro-gu, Seoul, Jesangga 2-dong, Basement floor, Unit 111, Republic of Korea
- HEAD OFFICE: 5F 90, Gyeongin-ro 53-gil, Guro-gu, Seoul, Republic of Korea

**서비스 안내:**
- 서비스명: mikro
- 서비스 형태: 동대문 패션 모바일 마켓플레이스(웹앱)

---

## 판매자 전용 기능

> `/seller/*` 경로는 SELLER 역할 로그인 필수. 미로그인 시 `/login?next=/seller`로 리다이렉트.

### 17. 판매자 대시보드 — `/seller`

| 항목 | 설명 |
|------|------|
| 헤더 | 상점명 + "전체 N개" + "상품 올리기" 버튼 |
| 필터 토글 | 판매중, 숨김, 품절, 삭제됨 카운트 표시 + 토글 |
| 상품 카드 | 첫 번째 MAIN 이미지 + 상품명 + 가격 |
| 상태 뱃지 | 판매중(초록), 숨김(회색), 품절(주황), 삭제됨(빨강) |
| 재고 표시 | 총 재고 합계 + 사이즈별 상세 (`S:10 M:8 L:6`) |
| 액션 버튼 | "숨김/판매" 토글 + "수정" 링크 |
| 재고 미세 조정 | 사이즈별 `- / +` 버튼으로 재고를 즉시 증감 (원자적 update) |
| 복제 | "복제" 버튼으로 기존 상품을 템플릿으로 신규 등록 화면 이동 |
| 빈 상태 | "아직 등록된 상품이 없어요" + "첫 상품 올리기" 버튼 |

---

### 18. 상품 올리기 — `/seller/products/new`

| 섹션 | 설명 |
|------|------|
| **대표 이미지** | 필수, 최대 10장, 가로 스크롤 미리보기, ←→ 순서 변경, × 삭제, 첫 번째에 "대표" 뱃지 |
| **상세 이미지** | 선택, 최대 20장, 동일한 미리보기 UI |
| **사이즈/재고** | 필수, 기본 S/M/L (재고 0), 사이즈명 + 재고 입력, 행 추가/삭제, 중복 사이즈 불가 |
| **상품명** | 필수, 최대 100자 |
| **가격** | 필수, 원화 포맷 자동 (쉼표), 0 이상 |
| **카테고리** | 선택: 아우터, 반팔티, 긴팔티, 니트, 셔츠, 바지, 원피스, 스커트 |
| **상품 설명** | 선택, 자유 텍스트 |
| **등록 버튼** | 로딩 스피너 표시 |

**업로드 흐름**:
1. 파일 선택 → 클라이언트에서 타입(jpg/png/webp/gif) + 크기(10MB) 검증
2. `POST /api/uploads/presign` → presigned S3 PUT URL 발급
3. 클라이언트가 S3에 직접 PUT 업로드
4. 모든 이미지 업로드 완료 후 `POST /api/seller/products` 호출

**복제 등록 흐름**:
- `/seller/products/new?cloneFrom={productId}` 접근 시 기존 상품 데이터 프리필
- MAIN/CONTENT 이미지, 제목/가격/카테고리/설명, 사이즈 라벨을 그대로 복사
- 재고는 모든 variant를 `0`으로 초기화해 새 상품으로 등록

---

### 19. 상품 수정 — `/seller/products/[id]/edit`

| 항목 | 설명 |
|------|------|
| 데이터 로딩 | `GET /api/seller/products/[id]`로 기존 데이터 프리필 |
| 폼 구조 | 상품 올리기와 동일 |
| 판매 상태 토글 | 우상단 "판매중 ●" / "숨김 ●" 버튼 → 즉시 PATCH |
| 저장 | PATCH — 스칼라 필드 업데이트 + 이미지/variants 전체 교체 (delete+recreate) |
| 삭제 | "삭제" 버튼 → confirm 다이얼로그 → DELETE 호출 |

---

## API 엔드포인트

### 인증
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/auth/login` | `{id, pw}` → 쿠키 발급 |
| POST | `/api/auth/logout` | 쿠키 삭제 |

### 상품 (고객용)
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/products/by-ids` | `{ids: string[]}` → 상품 배열 (찜 목록용) |

### 장바구니 (고객용)
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/cart` | 장바구니 조회 (자동 정리 포함), CUSTOMER 전용 |
| POST | `/api/cart` | 장바구니 추가 `{variantId, quantity}`, 중복 시 수량 증가 |
| DELETE | `/api/cart` | 장바구니 전체 삭제 |
| PATCH | `/api/cart/[id]` | 항목 수량 변경 `{quantity}`, 재고 검증 |
| DELETE | `/api/cart/[id]` | 항목 삭제 (본인 소유 검증) |

### 배송지 (고객용)
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/addresses` | 배송지 목록 조회, CUSTOMER 전용 |
| POST | `/api/addresses` | 배송지 추가, 첫 배송지는 자동 기본 설정 |
| PATCH | `/api/addresses/[id]` | 배송지 수정 (본인 소유 검증) |
| DELETE | `/api/addresses/[id]` | 배송지 삭제, 기본 배송지 삭제 시 최신 배송지가 기본으로 변경 |

### 주문 (고객용)
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/orders` | 주문 생성 `{items, address}`, 판매자별 분할 생성, 배송지/가격 스냅샷 저장, 30분 만료 설정 |
| GET | `/api/orders/[id]` | 주문 상세 조회 (본인 주문만) |
| POST | `/api/orders/by-ids` | 다중 주문 조회 `{ids}` (주문 완료 페이지용) |

### 상품 (판매자용)
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/seller/products` | 상품 생성 (mainImages, contentImages, variants) |
| GET | `/api/seller/products/[id]` | 상품 상세 (images by kind + variants) |
| PATCH | `/api/seller/products/[id]` | 상품 수정 (트랜잭션, 이미지/variants 교체 포함) |
| DELETE | `/api/seller/products/[id]` | 상품 삭제 (`isDeleted=true` soft delete) |

### 재고 (판매자용)
| Method | Path | 설명 |
|--------|------|------|
| PATCH | `/api/seller/variants/[id]/stock` | variant 재고 증감 (`delta` 정수, 음수 방어) |

### 이미지
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/uploads/presign` | S3 presigned PUT URL 발급 (SELLER 전용) |
| GET | `/api/images/[...path]` | S3 이미지 프록시 (presigned GET → 302 redirect) |

### 결제
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/payments/simulate` | 결제 성공 시뮬레이션 `{orderIds}`, 만료 검증 → 원자적 재고 차감 → Order.status=PAID, 이미 결제 시 alreadyPaid=true 반환 |
| POST | `/api/payments/simulate-fail` | 결제 실패 시뮬레이션 `{orderIds}`, Payment.status=FAILED 설정 (Order는 PENDING 유지) |
| POST | `/api/payments/confirm` | 실제 결제 확인 (Toss Payments 연동, 향후 구현) |

### 디버그
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/debug/env` | 환경변수 존재 여부 확인 (프로덕션 디버그용) |

---

## 재사용 컴포넌트

| 컴포넌트 | 설명 |
|---------|------|
| `ImageCarousel` | 횡스크롤 이미지 캐러셀, scroll-snap, 도트 인디케이터, 6장+ 카운터 뱃지 |
| `ProductCard` | 상품 카드 (고객/판매자 모드), 이미지 캐러셀 포함 |
| `ProductForm` | 판매자 상품 등록 공통 폼 (신규/복제 등록 공용) |
| `AddToCartSection` | 상품 상세 페이지 장바구니 담기 섹션 (사이즈/수량 선택 + 버튼) |
| `StockAdjuster` | 판매자 카드에서 사이즈별 재고 `- / +` 즉시 조절 |
| `WishlistButton` | 찜 토글 버튼 (card/detail 두 가지 variant) |
| `ToggleActiveButton` | 판매중↔숨김 토글 (PATCH isActive) |
| `SellerProductFilter` | 판매자 대시보드 필터 토글 (판매중/숨김/품절/삭제) |
| `Container` | max-w-420 중앙정렬 래퍼 |
| `TopBar` | 상단 고정 네비게이션 |
| `BottomTab` | 하단 고정 탭 네비게이션 |
| `Drawer` | 우측 슬라이드 메뉴 |
| `LogoutButton` | 로그아웃 버튼 |
| `SessionProvider` | 클라이언트 세션 컨텍스트 |

---

## 데이터 모델 (주요)

### Product
`id`, `sellerId`, `title`, `description`, `category`, `priceKrw`, `isActive`, `isDeleted`, `createdAt`, `updatedAt`

**상태 판정 규칙(코드 공통화):**
- `isDeleted=true` → `DELETED`
- `isDeleted=false` + `isActive=false` → `HIDDEN`
- `isDeleted=false` + `isActive=true` + `totalStock=0` → `SOLD_OUT`
- `isDeleted=false` + `isActive=true` + `totalStock>0` → `ACTIVE`

### ProductImage
`id`, `productId`, `url`, `kind` (MAIN/CONTENT), `sortOrder`

### ProductVariant
`id`, `productId`, `color` (기본 "FREE"), `sizeLabel`, `stock`, `sku` (optional), `@@unique([productId, color, sizeLabel])`

### User
`id`, `email`, `phone`, `name`, `role` (CUSTOMER/SELLER_PENDING/SELLER_ACTIVE/ADMIN)

### SellerProfile
`userId`, `shopName`, `type`, `marketBuilding`, `floor`, `roomNo`, `status` (PENDING/APPROVED/REJECTED), `shippingFeeKrw` (기본 3000), `freeShippingThreshold` (기본 50000)

### CartItem
`id`, `userId`, `variantId`, `quantity`, `createdAt`, `updatedAt`
- **Unique constraint**: `[userId, variantId]` — 사용자당 variant 중복 불가
- CUSTOMER 전용, 상품/variant 삭제 시 cascade delete

### Address
`id`, `userId`, `name`, `phone`, `zipCode`, `addr1`, `addr2`, `isDefault`, `createdAt`, `updatedAt`
- CUSTOMER 전용, 첫 번째 배송지 자동 기본 설정
- 기본 배송지 삭제 시 최신 배송지가 새 기본으로 변경

### Order
`id`, `orderNo`, `buyerId`, `sellerId`, `status` (PENDING/PAID/CANCELLED/PREPARING/SHIPPING/DELIVERED), `expiresAt` (30분 만료), `createdAt`, `updatedAt`

**가격 스냅샷 (주문 생성 시 저장, 결제 시 재계산 금지):**
- `itemsSubtotalKrw`: 상품 합계
- `shippingFeeKrw`: 배송비
- `totalPayKrw`: 총 결제금액 (= itemsSubtotalKrw + shippingFeeKrw)

**배송지 스냅샷 (주문 생성 시 Address에서 복사):**
- `shipToName`, `shipToPhone`, `shipToZip`, `shipToAddr1`, `shipToAddr2`, `shipToMemo`

### OrderItem
`id`, `orderId`, `productId`, `variantId`, `quantity`, `unitPriceKrw` (주문 시점 단가)

### Payment / Shipment
주문 → 주문아이템 → 결제 → 배송 파이프라인 (결제 시뮬레이션 API에서 원자적 재고 차감)

---

## 구조화된 상품 설명 (Structured Product Descriptions)

### 개요
Product 모델에 `descriptionJson` (Json 타입) 필드를 추가하여 구조화된 상품 설명을 지원합니다. 기존 `description` (String) 필드는 하위 호환성을 위해 유지됩니다.

### 스키마 구조 (v1)
```typescript
{
  v: 1,
  spec?: {
    measurements?: string;  // 사이즈
    modelInfo?: string;     // 모델 정보
    material?: string;      // 소재
    origin?: string;        // 원산지
    fit?: string;          // 핏
  },
  detail?: string,         // 상세 설명
  csShipping?: {
    courier?: string;       // 택배사
    csPhone?: string;       // 고객센터 전화
    csEmail?: string;       // 고객센터 이메일
    returnAddress?: string; // 반품 주소
    note?: string;         // 기타 안내
  }
}
```

### 검증 및 렌더링
- **sanitizeDescriptionJson()**: 입력 검증, 문자열 trim, 길이 제한 (500자)
- **renderDescriptionForCustomer()**: UI 렌더링용 정규화된 배열 반환
- **buildDescriptionInitialValues()**: 편집 폼 초기값 생성 (legacy description → detail 변환 지원)

### 판매자 API
- `POST /api/seller/products`: descriptionJson 저장 (Prisma.JsonNull 또는 sanitized object)
- `PATCH /api/seller/products/[id]`: descriptionJson 업데이트

### 판매자 UI (ProductForm)
상품 등록/수정 시 3개 섹션으로 구조화된 입력 폼 제공:
1. **상품 사양**: 사이즈, 모델 정보, 소재, 원산지, 핏
2. **상세 설명**: 자유 텍스트
3. **배송 및 고객센터**: 택배사, 고객센터 전화/이메일, 반품 주소, 기타 안내

### 고객 UI (/p/[id])
- descriptionJson이 있으면 3개 섹션으로 렌더링
- descriptionJson이 없으면 legacy description을 fallback으로 표시
- 둘 다 없으면 설명 섹션 미표시

### 테스트 체크리스트
- ✅ 신규 상품 등록: descriptionJson 저장 및 /p/[id]에서 3개 섹션 렌더링
- ✅ 기존 상품 (descriptionJson null): legacy description 텍스트 그대로 표시
- ✅ 기존 상품 수정: 편집 페이지에서 legacy description → detail 필드로 프리필, 저장 시 descriptionJson 생성
- ✅ TypeScript 컴파일: 빌드 통과 확인
- ✅ 하위 호환성: description 필드 유지, 기존 데이터 영향 없음

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router, Turbopack) |
| 데이터베이스 | PostgreSQL (Neon) |
| ORM | Prisma + @prisma/adapter-pg |
| 스토리지 | AWS S3 (presigned PUT/GET) |
| 인증 | HMAC-SHA256 서명 HttpOnly 쿠키 |
| 결제 | Toss Payments 연동 |
| 배포 | AWS Amplify |
| 스타일 | Tailwind CSS |
| 폰트 | Geist Sans |

---

## 판매자 운영 기능 (Seller Operations)

### 개요
판매자가 상품 판매 및 주문 관리를 효율적으로 수행할 수 있도록 4가지 핵심 기능을 추가합니다.

### 1. Instagram-style 판매자 상점 페이지 (`/s/[sellerId]`)

**레이아웃**:
- **헤더**:
  - 좌측: 브랜드 아바타 (원형, `sellerProfile.avatarUrl` 또는 initials)
  - 우측: 상점명, 유형 배지, 위치 정보 (상가명/층/호수)
  - 하단: 고객센터 버튼 (`csEmail`이 있으면 mailto 링크, 없으면 채팅 플레이스홀더)
- **상품 그리드**:
  - 3열 그리드 (1:1 정사각형 타일)
  - 각 타일: 메인 이미지, 가격 오버레이, 상품명
  - 클릭 시 `/p/[id]`로 이동
- **무한 스크롤**:
  - Intersection Observer 기반
  - 커서 페이지네이션 (createdAt desc, id tie-breaker)
  - `/api/sellers/[sellerId]/products?cursor=&limit=30`

**API**:
- `GET /api/sellers/[sellerId]/products`: 활성화된 상품 목록 (isActive=true, isDeleted=false)
- 응답: `{ items: Product[], nextCursor: string | null }`

---

### 2. 판매자 구매 허용 (Seller as Buyer)

**변경 사항**:
- 기존: SELLER 역할은 cart/checkout/orders API 차단
- 신규: SELLER 역할도 구매자 기능 사용 가능 (lib/roleGuards.ts 통합)

**역할 가드 (`lib/roleGuards.ts`)**:
- `canUseBuyerFeatures(session)`: 모든 인증된 사용자 허용 (CUSTOMER, SELLER_PENDING, SELLER_ACTIVE, ADMIN)
- `requireBuyerFeatures(session)`: 구매자 기능 API에서 사용
- `requireSeller(session)`: 판매자 전용 API에서 사용

**자가 구매 차단**:
- `/api/checkout/create-orders`에서 검증:
  - `item.variant.product.sellerId === session.userId` 시 409 에러
  - 메시지: "본인 상점의 상품은 구매할 수 없습니다."

**인증 업데이트 (`lib/auth.ts`)**:
- `Role` 타입: Prisma UserRole 열거형과 일치 (CUSTOMER, SELLER_PENDING, SELLER_ACTIVE, ADMIN)
- `isSellerRole(role)`: 판매자 역할 체크 헬퍼

---

### 3. 판매자 주문 관리

#### 주문 목록 (`/seller/orders`)
- **필터 탭**:
  - 전체, 결제완료(PAID), 배송중(SHIPPED), 환불요청(REFUND_REQUESTED), 완료(COMPLETED), 취소/실패(CANCELLED)
- **주문 카드**:
  - 주문번호, 상태 배지, 대표 상품명, 총 결제금액, 주문일
  - 클릭 시 `/seller/orders/[id]`로 이동
- **API**: `GET /api/seller/orders?status=&cursor=&limit=20`
  - 소유권 필터: `sellerId = session.userId`

#### 주문 상세 (`/seller/orders/[id]`)
- **배송지 정보 스냅샷**:
  - 받는분, 연락처, 우편번호, 주소, 배송 메모
  - **보안**: 구매자 이메일/계정 정보는 노출 안 함
- **주문 상품**: 상품명, 옵션, 수량, 단가
- **가격 내역**: 상품 금액, 배송비, 총 결제금액
- **상태 액션 버튼**:
  - PAID → SHIPPED: "발송 처리" 버튼
  - SHIPPED → COMPLETED: "배송 완료 처리" 버튼
  - REFUND_REQUESTED: 안내 메시지 (관리자 승인 대기)
- **API**:
  - `GET /api/seller/orders/[id]`: 소유권 체크 (sellerId === session.userId, 아니면 404)
  - `PATCH /api/orders/[id]/status`: 기존 상태 전환 API 재사용 (lib/orderState.ts 규칙 준수)

#### 상태 전환 규칙 (lib/orderState.ts)
- PAID → SHIPPED (판매자 발송)
- SHIPPED → COMPLETED (판매자 배송 완료)
- 모든 전환은 `canTransition()` 검증 통과 필수

---

### 4. 판매자 가입 신청 (Seller Apply Flow)

#### 신청 페이지 (`/seller/apply`)
- **로그인 필수**: 미로그인 시 `/login?next=/seller/apply`로 리다이렉트
- **상태별 UI**:
  - **신규 신청**: 폼 표시
  - **심사 중 (PENDING)**: "심사 중" 메시지 + 수정 가능
  - **승인 완료 (APPROVED)**: 판매자 센터로 이동 버튼

**신청 폼 필드**:
- 상점명 (필수)
- 상점 유형 (필수, 선택: 도매/브랜드/사입/기타)
- 상가명 (선택)
- 층 (선택)
- 호수 (선택)
- 고객센터 이메일 (필수, 이메일 형식 검증)

**API**:
- `POST /api/seller/apply`:
  - SellerProfile upsert (status=PENDING)
  - User.role → SELLER_PENDING으로 업데이트
  - 재신청 시 status 다시 PENDING으로 리셋
- `GET /api/seller/apply`:
  - 현재 사용자의 SellerProfile 상태 조회

**진입점**:
- `/login` 페이지: "판매자 가입 신청" 링크 추가
- `/my` 페이지:
  - CUSTOMER: "판매자 가입 신청" 메뉴 표시
  - SELLER_PENDING/SELLER_ACTIVE/ADMIN: "판매자 센터" 메뉴 표시
- `/seller` 페이지: "주문 관리" 퀵 링크 추가

---

## 테스트 가이드

- **수동 테스트**: `SELLER_OPS_TESTS.md` 참고
  - 소유권 제어 (다른 판매자 주문 접근 차단)
  - 상태 전환 (PAID→SHIPPED→COMPLETED)
  - 구매자 배송정보 가시성
  - 자가 구매 차단
  - 판매자의 다른 판매자 상품 구매 가능

---

## 데이터베이스 변경사항

### SellerProfile 스키마 추가 필드
- `avatarUrl` (String?, optional): 프로필 아바타 이미지 URL
- `csEmail` (String?, optional): 고객센터 이메일

### 마이그레이션
- `npx prisma db push` 실행 (개발 환경)
- 기존 판매자 프로필은 null 값으로 유지 (하위 호환성)

---

## 보안 고려사항

1. **주문 소유권**: 판매자는 `order.sellerId === session.userId`인 주문만 조회 가능
2. **구매자 정보 보호**: 판매자 주문 상세에서 구매자 이메일 노출 안 함 (배송지 스냅샷만)
3. **자가 구매 차단**: API 레벨에서 검증 (클라이언트 우회 불가)
4. **역할 분리**: lib/roleGuards.ts로 중앙화된 역할 체크

---

