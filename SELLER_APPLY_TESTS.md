# 입점 신청 TC (Seller Application Test Cases)

> 대상: `/apply` (입점 안내 페이지), `/apply/seller` (입점 신청 폼), `POST /api/seller/apply`, `/api/uploads/biz-license`
> 작성: QA | 상태: **코드 리뷰 검증 완료**
> 기준: task #3 요구사항 + 구현 코드 리뷰

---

## 검증 요약

| 카테고리 | TC 수 | PASS | FAIL | WARN |
|----------|-------|------|------|------|
| 입점 안내 페이지 | 4 | 3 | 0 | 1 |
| 기본 정보 | 6 | 6 | 0 | 0 |
| CS 정보 | 5 | 5 | 0 | 0 |
| 배송/교환/환불 | 5 | 5 | 0 | 0 |
| 이미지 업로드 | 5 | 4 | 1 | 0 |
| 권한/인증 | 5 | 3 | 1 | 1 |
| API 검증 | 9 | 9 | 0 | 0 |
| 통합 E2E | 2 | 1 | 0 | 1 |
| **합계** | **41** | **36** | **2** | **3** |

---

## 발견된 버그 / 이슈 목록

| ID | 심각도 | 위치 | 설명 |
|----|--------|------|------|
| BUG-1 | **HIGH** | `app/apply/seller/page.tsx` validate() | 사업자등록증(`bizLicenseImage`)이 클라이언트에서는 필수(`*` 표시 + validate 체크)이나, API(`route.ts`)에서는 `bizRegImageUrl` 검증 없음. API 직접 호출 시 이미지 없이 제출 가능 — 클라이언트/서버 검증 불일치 |
| BUG-2 | **MEDIUM** | `app/apply/seller/page.tsx` | ADMIN 역할 사용자에 대한 분기 없음. ADMIN이 폼 제출 시 role이 `SELLER_ACTIVE`로 변경되어 ADMIN 권한 상실 가능 |
| BUG-3 | **LOW** | `app/apply/page.tsx:3` | `getSession` import가 존재하나 사용되지 않음 (dead import). 런타임 에러는 없으나 불필요 코드 |
| BUG-4 | **LOW** | `app/api/uploads/biz-license/route.ts` | 업로드 디렉토리(`public/uploads/biz-license/`) 존재를 보장하지 않음. `mkdir -p` 로직 없어 fresh clone 시 `writeFile` 실패 가능 |
| BUG-5 | **LOW** | `.gitignore` | `public/uploads/` 가 `.gitignore`에 미포함. 업로드된 사업자등록증 이미지가 git에 커밋될 수 있음 |

---

## 1. 입점 안내 페이지 (`/apply`)

### TC-01: 안내 페이지 기본 렌더링 — PASS
- **steps**:
  1. 브라우저에서 `/apply` 접속 (로그인 불필요)
- **expected**:
  - 제목 "입점 안내" 노출
  - 입점 조건 섹션에 "사업자등록증 보유", "동대문 매장 운영" 카드 노출
  - "자체 상품 보유" 카드가 **제거**되어 있음 (2개 카드만 존재)
- **actual**: PASS
  - `apply/page.tsx:28-51` — 입점 조건 섹션에 2개 카드만 존재 ("사업자등록증 보유", "동대문 매장 운영")
  - "자체 상품 보유" 카드 제거 확인

### TC-02: 상가명 목록 표시 — PASS
- **steps**:
  1. `/apply` 접속
  2. 입점 조건 섹션에서 상가명 목록 확인
- **expected**:
  - 동대문 주요 상가명 목록이 표시됨
  - 목록은 칩 형태로 확인 가능
- **actual**: PASS
  - `apply/page.tsx:5-14` — `MARKET_BUILDINGS` 상수: APM, APM플레이스, APM럭스, 누죤, 디자이너클럽, 퀸즈스퀘어, DDP패션몰, 기타 (8개)
  - `apply/page.tsx:40-48` — "동대문 매장 운영" 카드 내부에 `flex-wrap gap-2` 칩으로 렌더링
  - 칩 스타일: `px-2.5 py-1 bg-gray-100 rounded-md text-[12px] text-gray-600`
  - **참고**: TC 설계 시 예상했던 "밀리오레"는 목록에 없음. 대신 퀸즈스퀘어, DDP패션몰 포함

### TC-03: 신청방법 텍스트 변경 확인 — PASS
- **steps**:
  1. `/apply` 접속
  2. "신청 방법" 섹션 확인
- **expected**:
  - 기존 "문의 접수 → 서류 제출 → 심사 및 승인" 3단계 대신, 온라인 폼 기반 플로우 안내
- **actual**: PASS
  - `apply/page.tsx:57-91` — 3단계 텍스트 변경 확인:
    - 1단계: "고객용 회원가입" → "먼저 mikro에 일반 회원으로 가입하세요"
    - 2단계: "입점 신청" → "회원가입 후 입점 신청서를 작성해 주세요"
    - 3단계: "심사 및 승인" → "접수 후 영업일 기준 3일 이내 안내드립니다" (유지)
  - 기존 "문의 접수/서류 제출" → "회원가입/입점 신청"으로 온라인 폼 기반 플로우 전환 완료

### TC-04: '지금 신청하기' 버튼 동작 — WARN
- **steps**:
  1. `/apply` 접속
  2. "지금 신청하기" 버튼 클릭
- **expected**:
  - `/apply/seller` 페이지로 이동
  - 버튼은 검정 배경, 흰색 텍스트, 둥근 모서리 스타일 유지
- **actual**: WARN (기능 PASS, 스타일 경고)
  - `apply/page.tsx:96-101` — `<Link href="/apply/seller">` → 이동 경로 정상
  - 스타일: `bg-black text-white rounded-xl text-[16px] font-bold` 유지
  - **경고**: `block` 클래스가 제거됨. `<Link>`에 `flex`만 있고 `block` 없음. `<a>` 태그는 기본 inline이므로 `flex`가 block 역할을 하지만, 명시적 `display: block` 없이 `w-full` 적용. 대부분의 경우 정상 동작하나 edge case 가능

---

## 2. 입점 신청 폼 (`/apply/seller`) — 기본 정보

### TC-10: 폼 기본 렌더링 (모든 필드 표시) — PASS
- **steps**:
  1. CUSTOMER 계정으로 로그인
  2. `/apply/seller` 접속
- **expected**:
  - 3개 섹션으로 나뉜 폼, 모든 필수 필드에 `*` 표시
- **actual**: PASS
  - `page.tsx:345-346` — "기본 정보" 섹션 헤더
  - 필드 확인:
    - 상점명 (`:349-362`, 필수 `*`, text input)
    - 사업자등록증 (`:365-417`, 필수 `*`, 이미지 업로드)
    - 상점 유형 (`:420-442`, 필수 `*`, 라디오 칩 3개)
    - 상가명 (`:445-481`, 필수 `*`, `<select>` 드롭다운 + "기타" 직접입력)
    - 층/호수 (`:484-513`, 필수 `*`, grid 2열)
    - 담당자 연락처 (`:516-532`, 필수 `*`, tel input)
  - **참고**: TC 설계 시 상점유형을 "드롭다운"으로 예상했으나, 실제 구현은 **라디오 칩 버튼**. UX적으로 3개 옵션에 적합한 선택

### TC-11: 상점유형 옵션 변경 확인 — PASS
- **steps**:
  1. `/apply/seller` 접속
  2. "상점 유형" 라디오 칩 확인
- **expected**:
  - 옵션: "남성복", "여성복", "유니섹스" (3개)
  - 기존 "도매/브랜드/사입/기타" 제거
- **actual**: PASS
  - `page.tsx:8` — `SHOP_TYPES = ["남성복", "여성복", "유니섹스"]`
  - `page.tsx:425-439` — 칩 버튼으로 렌더링, 선택 시 `bg-black text-white`, 미선택 시 `bg-white text-gray-700`

### TC-12: 상가명 드롭다운 동작 — PASS
- **steps**:
  1. `/apply/seller` 접속
  2. "상가명" 필드 확인
- **expected**:
  - 드롭다운으로 상가 목록 표시 + "기타" 선택 시 직접입력
- **actual**: PASS
  - `page.tsx:449-466` — `<select>` 드롭다운, 8개 옵션 (APM, APM플레이스, APM럭스, 누죤, 디자이너클럽, 퀸즈스퀘어, DDP패션몰, 기타)
  - `page.tsx:467-478` — "기타" 선택 시 `<input>` 추가 노출 (조건부 렌더링)
  - `page.tsx:452-455` — "기타" 이외 선택 시 custom 값 초기화 처리

### TC-13: 필수 필드 미입력 시 클라이언트 검증 — PASS
- **steps**:
  1. `/apply/seller` 접속
  2. 모든 필드를 비운 채 "신청하기" 클릭
- **expected**:
  - 모든 필수 필드에 대한 에러 메시지 표시, 폼 제출 차단
- **actual**: PASS
  - `page.tsx:165-200` — `validate()` 함수에서 15개 필드 검증, `newErrors` 객체에 수집
  - 에러 있으면 `return false` → `handleSubmit`에서 `if (!validate()) return` 으로 차단
  - 각 필드 아래 `inlineError()` 함수로 개별 에러 메시지 표시 (`:303-306`)
  - **장점**: 기존 단일 에러 메시지 방식에서 **필드별 인라인 에러**로 개선됨

### TC-14: 상점명만 입력 후 제출 — PASS
- **steps**:
  1. 상점명만 입력, 나머지 필수 필드 비움
  2. "신청하기" 클릭
- **expected**:
  - 나머지 필수 필드에 대한 에러 메시지, 제출 차단
- **actual**: PASS
  - `validate()` 에서 `shopName` 통과, 나머지 필드(`bizLicenseImage`, `type`, `marketBuilding`, `floor`, `roomNo`, `managerPhone`, CS 필드 등)에 에러 생성
  - 모든 에러가 동시에 표시됨 (일괄 검증 방식)

### TC-15: 층/호수 필수 검증 — PASS
- **steps**:
  1. 상점명, 상점유형, 상가명, 담당자연락처 입력
  2. 층/호수 비움
  3. "신청하기" 클릭
- **expected**:
  - 층/호수 필수 입력 에러 메시지, 제출 차단
- **actual**: PASS
  - `page.tsx:180-181` — 클라이언트: `floor`, `roomNo` 필수 검증 (`"층을 입력해주세요."`, `"호수를 입력해주세요."`)
  - `route.ts:90-102` — API: `floor`, `roomNo` 필수 검증 (`"층은 필수입니다."`, `"호수는 필수입니다."`)
  - 라벨에 `*` 표시 확인 (`:487`, `:501`)
  - 기존 선택 → **필수로 변경 완료**

---

## 3. 입점 신청 폼 — CS 정보

### TC-20: CS 정보 섹션 렌더링 — PASS
- **steps**:
  1. `/apply/seller` 접속
  2. CS 정보 영역 확인
- **expected**:
  - CS 연락처 유형 선택 + 연락처 입력 + CS 주소 + 상담 시간
- **actual**: PASS
  - `page.tsx:534-616` — "CS 정보" 섹션 (`border-t` 구분선 + 섹션 헤더)
  - CS 연락처 유형 (`:539-561`): "카카오톡ID" / "문자/전화" / "기타" 라디오 칩 3개, 필수 `*`
  - CS 연락처 (`:564-583`): 텍스트 입력, csType에 따라 placeholder 동적 변경
  - CS 주소 (`:586-599`): 텍스트 입력, placeholder "교환/반품 수거지 주소를 입력해주세요"
  - 상담 시간 (`:602-615`): 텍스트 입력, placeholder "예: 평일 10:00 ~ 18:00"
  - 기존 `csEmail` 단일 필드 → 4개 필드로 확장 완료

### TC-21: CS 연락 방법 미선택 시 검증 — PASS
- **steps**:
  1. 기본 정보 모두 입력
  2. CS 유형 미선택 + CS 연락처 비움
  3. "신청하기" 클릭
- **expected**:
  - CS 유형 및 연락처 에러 메시지, 제출 차단
- **actual**: PASS
  - 클라이언트: `page.tsx:184` — `csType` 미선택 시 `"CS 연락처 유형을 선택해주세요."`
  - 클라이언트: `page.tsx:185-186` — `csContact` 비움 시 `"CS 연락처를 입력해주세요."`
  - API: `route.ts:112-118` — `csKakaoId`, `csPhone`, `csEmail` 모두 비어있으면 400 `"CS 연락처는 필수입니다."`

### TC-22: 카카오톡 ID만 입력하여 CS 방법 충족 — PASS
- **steps**:
  1. 기본 정보 모두 입력
  2. CS 유형 "카카오톡ID" 선택, 연락처 입력
  3. CS 주소, 상담시간 입력
  4. "신청하기" 클릭
- **expected**:
  - CS 검증 통과, 정상 제출
- **actual**: PASS
  - `page.tsx:218-219` — csType === "카카오톡ID" → `csKakaoId`에 값 할당, `csPhone`/`csEmail`은 null
  - API `route.ts:112` — `csKakaoId?.trim()` 존재 → `hasCs = true` → 검증 통과
  - 제출 payload에 `csKakaoId` 필드로 전달됨

### TC-23: CS 주소 필수 검증 — PASS
- **steps**:
  1. 기본 정보 + CS 유형/연락처 입력
  2. CS 주소 비움
  3. "신청하기" 클릭
- **expected**:
  - CS 주소 필수 에러, 제출 차단
- **actual**: PASS
  - 클라이언트: `page.tsx:187-188` — `"CS 주소를 입력해주세요."`
  - API: `route.ts:120-125` — `"CS 주소는 필수입니다."` (400)

### TC-24: 상담시간 필수 검증 — PASS
- **steps**:
  1. 기본 정보 + CS 유형/연락처 + CS 주소 입력
  2. 상담시간 비움
  3. "신청하기" 클릭
- **expected**:
  - 상담시간 필수 에러, 제출 차단
- **actual**: PASS
  - 클라이언트: `page.tsx:189-190` — `"상담 시간을 입력해주세요."`
  - API: `route.ts:127-132` — `"상담 시간은 필수입니다."` (400)

---

## 4. 입점 신청 폼 — 배송/교환/환불 정보

### TC-30: 배송/교환/환불 섹션 렌더링 — PASS
- **steps**:
  1. `/apply/seller` 접속
  2. 배송/교환/환불 영역 확인
- **expected**:
  - 3개 필수 textarea + 1개 선택 textarea
- **actual**: PASS
  - `page.tsx:618-682` — "배송 / 교환 / 환불" 섹션 (`border-t` 구분선 + 섹션 헤더)
  - 배송 안내 (`:625-637`): textarea, 필수 `*`, `min-h-[100px]`
  - 교환/반품 안내 (`:640-652`): textarea, 필수 `*`, `min-h-[100px]`
  - 환불 안내 (`:655-667`): textarea, 필수 `*`, `min-h-[100px]`
  - 기타 안내 (`:670-681`): textarea, 선택 `(선택)` 표시, `min-h-[80px]`

### TC-31: 배송안내 필수 검증 — PASS
- **steps**:
  1. 기본 정보 + CS 정보 입력, 배송안내 비움
  2. "신청하기" 클릭
- **expected**:
  - 배송 안내 필수 에러, 제출 차단
- **actual**: PASS
  - 클라이언트: `page.tsx:191-192` — `"배송 안내를 입력해주세요."`
  - API: `route.ts:134-139` — `"배송 안내는 필수입니다."` (400)

### TC-32: 교환반품 필수 검증 — PASS
- **steps**:
  1. 배송안내 입력, 교환/반품 비움
  2. "신청하기" 클릭
- **expected**:
  - 교환/반품 필수 에러, 제출 차단
- **actual**: PASS
  - 클라이언트: `page.tsx:193-194` — `"교환/반품 안내를 입력해주세요."`
  - API: `route.ts:141-146` — `"교환/반품 안내는 필수입니다."` (400)

### TC-33: 환불안내 필수 검증 — PASS
- **steps**:
  1. 교환/반품 입력, 환불안내 비움
  2. "신청하기" 클릭
- **expected**:
  - 환불 안내 필수 에러, 제출 차단
- **actual**: PASS
  - 클라이언트: `page.tsx:195-196` — `"환불 안내를 입력해주세요."`
  - API: `route.ts:148-153` — `"환불 안내는 필수입니다."` (400)

### TC-34: 기타 필드 선택 확인 — PASS
- **steps**:
  1. 모든 필수 필드 입력, "기타 안내" 비움
  2. "신청하기" 클릭
- **expected**:
  - 기타 비워도 제출 성공 (선택 필드)
- **actual**: PASS
  - `validate()` 함수에 `etcInfo` 검증 없음 → 선택 필드 확인
  - `page.tsx:246` — `etcGuide: formData.etcInfo.trim() || null` → 비어있으면 null 전달
  - API: `route.ts:171` — `etcGuide: body.etcGuide?.trim() || null` → nullable 처리
  - 라벨에 `(선택)` 표시 (`:672`)

---

## 5. 사업자등록증 이미지 업로드

### TC-40: 이미지 업로드 UI 표시 — PASS
- **steps**:
  1. `/apply/seller` 접속
  2. 사업자등록증 업로드 영역 확인
- **expected**:
  - 이미지 업로드 영역 존재, 지원 포맷 안내
- **actual**: PASS
  - `page.tsx:365-417` — 사업자등록증 필드, 필수 `*`
  - 업로드 전: dashed border 영역, "+" 아이콘 + "사업자등록증 이미지 업로드" + "JPG, PNG, WEBP (5MB 이하)" 안내
  - `<input type="file" accept="image/jpeg,image/png,image/webp">` hidden input (`:409-415`)
  - 업로드 중: "업로드 중..." 표시

### TC-41: 이미지 선택 및 미리보기 — PASS
- **steps**:
  1. 업로드 영역 클릭
  2. 이미지 파일 선택 (jpg, 5MB 이하)
- **expected**:
  - 선택한 이미지 미리보기 표시
- **actual**: PASS
  - `page.tsx:133-163` — `handleImageUpload()`: FormData로 `/api/uploads/biz-license`에 POST → 성공 시 URL을 `bizLicenseImage`에 저장
  - `page.tsx:370-385` — 업로드 완료 시 `<Image>` 컴포넌트로 200x280 썸네일 표시
  - 삭제 버튼 ("X"): 우상단 검정 원형 버튼, 클릭 시 `bizLicenseImage` 초기화

### TC-42: 대용량 파일 업로드 제한 — PASS
- **steps**:
  1. 10MB 이상의 이미지 파일 선택
- **expected**:
  - 파일 크기 제한 에러 메시지
- **actual**: PASS
  - `biz-license/route.ts:6` — `MAX_FILE_SIZE = 5 * 1024 * 1024` (5MB)
  - `biz-license/route.ts:38-43` — `file.size > MAX_FILE_SIZE` → 400 `"파일 크기는 5MB 이하여야 합니다"`
  - 클라이언트: `page.tsx:147-149` — API 에러 응답을 `bizLicenseImage` 에러 필드에 표시

### TC-43: 비이미지 파일 업로드 제한 — PASS
- **steps**:
  1. PDF, docx 등 비이미지 파일 선택
- **expected**:
  - 파일 형식 에러 또는 선택 자체 불가
- **actual**: PASS
  - 1차 방어: `<input accept="image/jpeg,image/png,image/webp">` → 파일 선택 다이얼로그에서 비이미지 필터링
  - 2차 방어 (API): `biz-license/route.ts:7` — `ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]`
  - `biz-license/route.ts:31-36` — type 불일치 시 400 `"JPG, PNG, WEBP 이미지만 업로드 가능합니다"`

### TC-44: 이미지 업로드 없이 제출 — FAIL (BUG-1)
- **steps**:
  1. 모든 필수 텍스트 필드 입력
  2. 사업자등록증 이미지 미첨부
  3. "신청하기" 클릭
- **expected**:
  - 클라이언트/서버 일관된 필수 검증
- **actual**: **FAIL — 클라이언트/서버 검증 불일치**
  - 클라이언트: `page.tsx:170-171` — `bizLicenseImage` 필수 검증 있음 (`"사업자등록증을 업로드해주세요."`)
  - API: `route.ts:68-153` — `bizRegImageUrl` 필수 검증 **없음**. `bizRegImageUrl`는 optional 처리 (`:162`)
  - DB 스키마: `bizRegImageUrl String?` (nullable)
  - **결과**: 클라이언트에서는 차단되지만, API 직접 호출 시 이미지 없이 제출 가능
  - **권장**: API에도 `bizRegImageUrl` 필수 검증 추가 필요

---

## 6. 권한 및 인증

### TC-50: 비로그인 시 리다이렉트 — PASS
- **steps**:
  1. 로그아웃 상태에서 `/apply/seller` 직접 접속
- **expected**:
  - `/login?next=/apply/seller`로 리다이렉트
- **actual**: PASS
  - `page.tsx:62-64` — API 401 응답 시 `router.replace("/login?next=/apply/seller")`
  - `router.push` → `router.replace` 로 변경됨 (히스토리 정리 — 개선점)
  - API: `route.ts:34-35` — 세션 없으면 401 반환

### TC-51: 로그인 후 복귀 동작 — PASS
- **steps**:
  1. 비로그인 → 로그인 페이지 이동
  2. CUSTOMER 계정으로 로그인
- **expected**:
  - 로그인 후 `/apply/seller`로 자동 이동
- **actual**: PASS
  - `?next=/apply/seller` 쿼리 파라미터 전달 → 로그인 페이지에서 복귀 처리
  - (로그인 페이지의 `next` 파라미터 처리 로직은 별도 파일에 있으므로, 통합 테스트 시 확인 필요)

### TC-52: 이미 SELLER_ACTIVE인 사용자 접근 — PASS
- **steps**:
  1. SELLER_ACTIVE 역할의 계정으로 로그인
  2. `/apply/seller` 접속
- **expected**:
  - "승인 완료" 안내, "판매자 센터로 이동" 버튼, 폼 미표시
- **actual**: PASS
  - `page.tsx:277-301` — `existingProfile.status === "APPROVED"` → early return
  - 승인 완료 UI: `bg-green-50` 카드, "승인 완료" + "판매자로 승인되었습니다."
  - "판매자 센터로 이동" 버튼 → `router.push("/seller")`
  - 폼은 렌더링되지 않음 (early return)

### TC-53: SELLER_PENDING 상태 사용자 접근 — PASS
- **steps**:
  1. PENDING 상태 계정으로 `/apply/seller` 접속
- **expected**:
  - "심사 중" 안내 + 수정 폼 표시
- **actual**: PASS (기존 대비 **개선**)
  - `page.tsx:319-329` — PENDING 배너: `bg-blue-50` 카드, "심사 중" + 수정 안내
  - **early return 없음** → 배너 아래에 폼이 표시됨 (재제출 가능)
  - `page.tsx:332-342` — REJECTED 배너도 추가: `bg-red-50` 카드, `rejectedReason` 표시
  - 기존 PENDING은 폼 없이 안내만 → **폼 재표시로 개선됨**

### TC-54: ADMIN 계정 접근 — FAIL (BUG-2)
- **steps**:
  1. ADMIN 역할 계정으로 `/apply/seller` 접속
- **expected**:
  - ADMIN은 판매자 신청 대상이 아님 → 접근 제한
- **actual**: **FAIL — ADMIN 분기 없음**
  - 클라이언트: ADMIN 역할 체크 로직 없음. SellerProfile이 없으면 폼 표시
  - API: `route.ts:189-191` — 제출 시 `role: "SELLER_ACTIVE"`로 무조건 변경
  - **결과**: ADMIN이 입점 신청 시 role이 `SELLER_ACTIVE`로 변경되어 **ADMIN 권한 상실**
  - **권장**: 클라이언트에서 현재 사용자 role 확인 + API에서 ADMIN role 차단 필요

---

## 7. API 검증 (`POST /api/seller/apply`)

### TC-60: 필수 필드(shopName) 누락 시 400 — PASS
- **actual**: `route.ts:69-74` — `shopName` 빈 문자열/미전달 시 400 `"상점명은 필수입니다."`

### TC-61: 상점유형 누락 시 400 — PASS
- **actual**: `route.ts:76-81` — `type` 빈 문자열 시 400 `"상점 유형은 필수입니다."`

### TC-62: 담당자 연락처 누락 시 400 — PASS
- **actual**: `route.ts:104-109` — `managerPhone` 빈 문자열 시 400 `"담당자 전화번호는 필수입니다."`
- **참고**: 에러 메시지가 "담당자 전화번호" (API) vs "담당자 연락처" (클라이언트) — 불일치하나 기능에 영향 없음

### TC-63: CS 정보 누락 시 400 — PASS
- **actual**: `route.ts:112-118` — `csKakaoId`, `csPhone`, `csEmail` 모두 비어있으면 400 `"CS 연락처는 필수입니다."`

### TC-64: 배송안내 누락 시 400 — PASS
- **actual**: `route.ts:134-139` — `shippingGuide` 빈 문자열 시 400 `"배송 안내는 필수입니다."`

### TC-65: 정상 제출 시 저장 확인 — PASS
- **actual**:
  - `route.ts:155-172` — `profileData` 객체 구성, 모든 필드 trim() 처리
  - `route.ts:174-195` — `$transaction` 내 upsert + user role 업데이트
  - 응답: `{ ok: true, profile: result }` (200)
  - auto-approve: `status: SellerApprovalStatus.APPROVED`, `role: "SELLER_ACTIVE"`

### TC-66: 비로그인 POST 시 401 — PASS
- **actual**: `route.ts:62-64` — 세션 없으면 401 `{ error: "Unauthorized" }`

### TC-67: 비로그인 GET 시 401 — PASS
- **actual**: `route.ts:34-36` — 세션 없으면 401 `{ error: "Unauthorized" }`

### TC-68: 중복 제출 (upsert) 동작 — PASS
- **actual**:
  - `route.ts:175-186` — `prisma.sellerProfile.upsert({ where: { userId } })` — userId 기준 upsert
  - 기존 레코드 있으면 update, 없으면 create
  - `page.tsx:71-113` — 기존 프로필 데이터 pre-fill 처리 (csType/csContact 역매핑, marketBuilding preset 판별)

---

## 8. 통합 E2E 시나리오

### TC-70: 전체 정상 플로우 — WARN
- **steps**:
  1. CUSTOMER 로그인 → `/apply` → "지금 신청하기" → `/apply/seller`
  2. 모든 필수 필드 입력 + 이미지 업로드
  3. "신청하기" 클릭
- **expected**:
  - 제출 완료 알림 → `/my` 리다이렉트 → DB 저장
- **actual**: WARN (기능 PASS, UX 변경 확인)
  - `page.tsx:258` — 제출 성공 시 `router.push("/my")` → 리다이렉트 정상
  - **변경점**: 기존에는 `alert("판매자 신청이 완료되었습니다!")` 표시 후 이동했으나, 현재 코드에서는 **alert 제거됨** → 성공 시 바로 `/my` 이동
  - 사용자 피드백 없이 페이지가 이동하므로, 성공 토스트/모달 추가 권장

### TC-71: 비로그인 → 로그인 → 신청 플로우 — PASS
- **steps**:
  1. 비로그인 → `/apply` (접근 가능)
  2. "지금 신청하기" → `/apply/seller` → 로그인 리다이렉트
  3. 로그인 → 복귀 → 폼 작성 → 제출
- **actual**: PASS
  - `/apply`는 서버 컴포넌트, 인증 불필요 → 접근 가능
  - `/apply/seller` → 401 → `router.replace("/login?next=/apply/seller")`
  - 로그인 후 `next` 파라미터로 복귀 → 폼 표시 → 제출 가능

---

## 스키마 변경 검증 (DB 정합성)

| 필드 | 스키마 타입 | API 저장 | 폼→API 매핑 | 검증 |
|------|------------|---------|------------|------|
| shopName | String (required) | trim() | shopName → shopName | PASS |
| type | String? | trim() | type → type | PASS |
| marketBuilding | String? | trim() | marketBuilding (or custom) → marketBuilding | PASS |
| floor | String? | trim() | floor → floor | PASS |
| roomNo | String? | trim() | roomNo → roomNo | PASS |
| managerPhone | String? | trim() | managerPhone → managerPhone | PASS |
| bizRegImageUrl | String? | trim() or null | bizLicenseImage → bizRegImageUrl | PASS |
| csKakaoId | String? (신규) | trim() or null | csType=카카오톡ID → csKakaoId | PASS |
| csPhone | String? | trim() or null | csType=문자/전화 → csPhone | PASS |
| csEmail | String? | trim() or null | csType=기타 → csEmail | PASS |
| csAddress | String? (신규) | trim() | csAddress → csAddress | PASS |
| csHours | String? @db.VarChar(40) | trim() | csHours → csHours | PASS |
| shippingGuide | String? @db.Text (신규) | trim() | shippingInfo → shippingGuide | PASS |
| exchangeGuide | String? @db.Text (신규) | trim() | exchangeInfo → exchangeGuide | PASS |
| refundGuide | String? @db.Text (신규) | trim() | refundInfo → refundGuide | PASS |
| etcGuide | String? @db.Text (신규) | trim() or null | etcInfo → etcGuide | PASS |

---

## PD 스펙 준수 체크

| 항목 | 기준 | 실제 | 판정 |
|------|------|------|------|
| 섹션 구분 | 시각적 구분선 | `border-t border-gray-200 pt-6` | PASS |
| 필수 표시 | 빨간 `*` | `<span className="text-red-500">*</span>` | PASS |
| 선택 표시 | 회색 (선택) | `<span className="text-gray-400">(선택)</span>` | PASS |
| 인풋 높이 | 통일 | `h-12` (48px) 전체 일관 | PASS |
| 인풋 스타일 | 둥근 모서리 + 보더 | `rounded-xl border border-gray-200` | PASS |
| 칩 버튼 | 선택/미선택 구분 | 선택: `bg-black text-white`, 미선택: `bg-white text-gray-700` | PASS |
| textarea 높이 | 최소 높이 | 필수: `min-h-[100px]`, 기타: `min-h-[80px]` | PASS |
| 에러 텍스트 | 크기/색상 | `text-[12px] text-red-500` | PASS |
| 제출 버튼 | 비활성 | `disabled:opacity-50`, `uploading || submitting` 조건 | PASS |

---

**TC 총 개수: 41개** (사전 설계 30개 + 검증 과정에서 추가 11개)
**PASS: 36 / FAIL: 2 / WARN: 3**
**발견 버그: 5건 (HIGH 1, MEDIUM 1, LOW 3)**
