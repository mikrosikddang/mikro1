# MIKRO 개발 TODO

> 완료된 항목은 [x]로 체크. 모든 항목 완료 시 이 파일 삭제.

---

## 1. 결제 금액 검증 정리
- [x] `payments/confirm`: `order.totalPayKrw`로 통일
- [x] `totalAmountKrw` 사용처 → `totalPayKrw` 일원화
- [x] Payment 레코드 없이 PAID 되는 경로 방어 코드 추가
- [x] QA 검증 PASS

## 2. 사업자등록번호
- [x] SellerProfile에 `bizRegNo String?` 필드 추가
- [x] 셀러 신청 폼에 입력 필드 추가 (optional)
- [x] 셀러 상점 페이지에 사업자 정보 표시

## 3. 유저 표시 정보 정리
- [x] 세션에 name/email 포함
- [x] Drawer/MenuProfileRow/MyPage/AdminLayout → 이름 표시
- [x] 회원가입 폼에 이름 필드 추가
- [x] signup API에서 name 파라미터 저장
- [x] QA 검증 PASS

## 4. 리뷰 시스템
- [x] Review 모델 추가 + API 3개
- [x] 상품 상세 페이지에 리뷰 목록 + 평균 별점
- [x] 주문 상세에서 리뷰 작성 (COMPLETED만)
- [x] content 2000자 제한 + HTML strip (QA 수정)
- [x] QA 검증 PASS

## 5. 할인가
- [x] Product에 `salePriceKrw Int?` 필드 추가
- [x] 상품 등록/수정 폼에 할인가 입력
- [x] 상품 카드/상세에 정가 취소선 + 할인가 + 할인율 표시
- [x] 주문 시 salePriceKrw 우선 적용
- [ ] PriceText 할인율 뱃지 형태 통일 (PD 수정 지시, FE 진행 중)
- [x] QA 검증 PASS

## 6. 문의 (QnA)
- [x] Inquiry 모델 추가 + API 5개 (비밀글 포함)
- [x] 상품 상세에 문의 섹션 + 작성 바텀시트
- [x] 셀러 문의 관리 페이지 (/seller/inquiries)
- [x] question/answer HTML strip (QA 수정)
- [x] QA 검증 PASS

## 7. 쿠폰
- [x] Coupon/UserCoupon 모델 + DiscountType enum
- [x] API 5개 (claim, apply, my/coupons, admin)
- [x] 내 쿠폰 페이지 + 체크아웃 쿠폰 적용 UI
- [x] claim $transaction race condition 수정 (QA 수정)
- [x] QA 검증 PASS

## 8. 알림 시스템
- [x] Notification 모델 + API 4개
- [x] 알림 생성 헬퍼 (fire-and-forget)
- [x] 주문 상태 변경/문의 답변 시 자동 알림
- [x] TopBar 알림 아이콘 + 뱃지
- [x] /notifications 알림 목록 페이지
- [ ] 알림 UI PD 스펙 반영 (bg-gray-50, 인디케이터 점, 9+ 뱃지) — FE 진행 중
- [x] QA 검증 PASS

## 9. 위시리스트 DB 이관
- [x] Wishlist 모델 + API 4개
- [x] WishlistButton 로그인/비로그인 분기
- [x] wishlist 페이지 DB 연동
- [x] QA 검증 PASS

## 10. 주문 인덱스 보강
- [x] Order에 `@@index([sellerId, status])` 추가
- [x] Order에 `@@index([createdAt])` 추가
