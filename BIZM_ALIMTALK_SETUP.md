# BizM Alimtalk Setup

## Local env

Add these values to local and production environment variables.

```env
BIZM_API_BASE="https://alimtalk-api.bizmsg.kr"
BIZM_USER_ID="your-bizm-userid"
BIZM_SENDER_PROFILE_KEY="e6d1f3729e722aabf09c73419fb68386461ae90b"
BIZM_TEMPLATE_ORDER_PAID="approved-template-id"
BIZM_TEMPLATE_ORDER_CANCELLED="approved-template-id"
BIZM_TEMPLATE_ORDER_SHIPPED="approved-template-id"
BIZM_TEMPLATE_ORDER_COMPLETED="approved-template-id"
BIZM_TEMPLATE_ORDER_REFUNDED="approved-template-id"
```

## Triggered statuses

- `PAID`: 주문 확정
- `CANCELLED`: 주문 취소
- `SHIPPED`: 발송 완료
- `COMPLETED`: 주문 완료
- `REFUNDED`: 환불 완료

## Recommended template codes

- `BIZM_TEMPLATE_ORDER_PAID` -> `mikro_order_paid_v1`
- `BIZM_TEMPLATE_ORDER_CANCELLED` -> `mikro_order_cancelled_v1`
- `BIZM_TEMPLATE_ORDER_SHIPPED` -> `mikro_order_shipped_v1`
- `BIZM_TEMPLATE_ORDER_COMPLETED` -> `mikro_order_completed_v1`
- `BIZM_TEMPLATE_ORDER_REFUNDED` -> `mikro_order_refunded_v1`

## Suggested template copy

### 1. 주문 확정

Template code: `mikro_order_paid_v1`

```text
[미크로] 주문이 확정되었습니다.

주문번호: #{주문번호}
주문자명: #{주문자명}
결제금액: #{결제금액}
배송지: #{배송지}

감사합니다.
```

### 2. 주문 취소

Template code: `mikro_order_cancelled_v1`

```text
[미크로] 주문이 취소되었습니다.

주문번호: #{주문번호}
주문자명: #{주문자명}

이용해 주셔서 감사합니다.
```

### 3. 발송 완료

Template code: `mikro_order_shipped_v1`

```text
[미크로] 상품 발송이 완료되었습니다.

주문번호: #{주문번호}
택배사: #{택배사}
송장번호: #{송장번호}

배송 조회는 택배사 홈페이지에서 확인해주세요.
```

### 4. 주문 완료

Template code: `mikro_order_completed_v1`

```text
[미크로] 주문이 완료되었습니다.

주문번호: #{주문번호}
주문자명: #{주문자명}

미크로를 이용해 주셔서 감사합니다.
```

### 5. 환불 완료

Template code: `mikro_order_refunded_v1`

```text
[미크로] 환불이 완료되었습니다.

주문번호: #{주문번호}
환불금액: #{환불금액}

이용해 주셔서 감사합니다.
```

## Notes

- 알림톡 발송에는 `BIZM_USER_ID`와 승인된 `tmplId`가 반드시 필요합니다.
- 현재 코드는 템플릿이 등록되면 `msg`에 실제 값이 들어간 완성 문구를 보내도록 되어 있습니다.
- 발송 실패는 주문 처리 자체를 막지 않고 서버 로그에만 남습니다.
- `SHIPPED` 템플릿은 코드에서 누락값을 `-`로 채워 고정 포맷으로 발송합니다.
