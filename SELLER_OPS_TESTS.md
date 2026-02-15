# Seller Operations Manual Testing Guide

This document outlines manual test scenarios for the seller-facing features implemented in Phase 3.

## Prerequisites

- Two test accounts:
  - **Seller Account**: Login with `s/s` (MVP seller account)
  - **Customer Account**: Login with `1/1` (MVP customer account)
- At least 2 products from different sellers in the database
- At least 1 order with seller 's' as the seller

## Test Scenarios

### 1. Seller Order Access Control

**Objective**: Verify sellers can only see their own orders

**Steps**:
1. Login as seller (`s/s`)
2. Navigate to `/seller/orders`
3. Verify you see orders list
4. Note down an order ID from the list
5. Navigate to `/seller/orders/[that-order-id]`
6. Verify order details load successfully
7. Copy another seller's order ID (if available in DB)
8. Navigate to `/seller/orders/[other-seller-order-id]`
9. **Expected**: Should see 404 or "Order not found" error

**Pass Criteria**:
- ✅ Seller sees only their own orders in the list
- ✅ Seller can view details of their own orders
- ✅ Seller cannot access other sellers' order details (404)

---

### 2. Order Status Transitions

**Objective**: Verify status action buttons work correctly

**Steps**:
1. Login as customer (`1/1`)
2. Add a product from seller 's' to cart
3. Complete checkout and payment (use simulate payment)
4. Note the order number
5. Logout and login as seller (`s/s`)
6. Navigate to `/seller/orders`
7. Find the new order (should be status: PAID)
8. Click on the order to view details
9. **Expected**: "발송 처리" button should be visible
10. Click "발송 처리"
11. Confirm the action
12. **Expected**: Order status changes to SHIPPED
13. **Expected**: "배송 완료 처리" button should now be visible
14. Click "배송 완료 처리"
15. Confirm the action
16. **Expected**: Order status changes to COMPLETED

**Pass Criteria**:
- ✅ Status actions only appear when transitions are valid
- ✅ PAID → SHIPPED transition works
- ✅ SHIPPED → COMPLETED transition works
- ✅ Invalid transitions do not show action buttons

---

### 3. Buyer Shipping Information Visibility

**Objective**: Verify seller can see buyer shipping info but not sensitive buyer data

**Steps**:
1. Login as seller (`s/s`)
2. Navigate to `/seller/orders`
3. Click on any order
4. **Expected**: Should see shipping information:
   - Recipient name (shipToName)
   - Phone number (shipToPhone)
   - Address (shipToAddr1, shipToAddr2, zipCode)
   - Delivery memo (if present)
5. **Expected**: Should NOT see buyer's email or full user account details

**Pass Criteria**:
- ✅ Seller sees all shipping fields from order snapshot
- ✅ Buyer email is not displayed
- ✅ No buyer account information is leaked

---

### 4. Self-Purchase Prevention

**Objective**: Verify sellers cannot buy their own products

**Steps**:
1. Login as seller (`s/s`)
2. Navigate to seller's own shop page (`/s/[seller-id]`)
3. Click on one of their own products
4. Click "Add to Cart"
5. Go to cart
6. Proceed to checkout
7. Select shipping address
8. Click "Create Order"
9. **Expected**: Error message "본인 상점 상품은 구매할 수 없습니다."

**Pass Criteria**:
- ✅ Seller can add own product to cart (not blocked at cart level)
- ✅ Checkout is blocked with clear error message
- ✅ Error specifically mentions self-purchase restriction

---

### 5. Seller Can Buy from Other Sellers

**Objective**: Verify sellers can purchase from other sellers

**Steps**:
1. Login as seller (`s/s`)
2. Navigate to another seller's product (not owned by 's')
3. Add product to cart
4. Proceed to checkout
5. Complete payment simulation
6. **Expected**: Order is created successfully
7. Navigate to `/orders` (buyer orders view)
8. **Expected**: Should see the new order as a buyer

**Pass Criteria**:
- ✅ Seller can add other sellers' products to cart
- ✅ Seller can complete checkout successfully
- ✅ Seller can view their buyer orders in `/orders`
- ✅ Seller maintains access to both buyer and seller features

---

### 6. Order Status Filters

**Objective**: Verify status filter tabs work correctly

**Steps**:
1. Login as seller (`s/s`)
2. Navigate to `/seller/orders`
3. Click on each filter tab:
   - 전체 (All)
   - 결제완료 (PAID)
   - 배송중 (SHIPPED)
   - 환불요청 (REFUND_REQUESTED)
   - 완료 (COMPLETED)
   - 취소/실패 (CANCELLED)
4. **Expected**: Order list updates to show only orders matching the selected status

**Pass Criteria**:
- ✅ All filter tabs are clickable
- ✅ Order list updates correctly for each filter
- ✅ "전체" shows all orders regardless of status

---

## Security Checklist

- [ ] Seller cannot access orders where `order.sellerId !== session.userId`
- [ ] Seller cannot modify orders belonging to other sellers
- [ ] Buyer personal data (email) is not exposed in seller order view
- [ ] Self-purchase is blocked at checkout API level
- [ ] Status transitions follow `lib/orderState.ts` rules strictly

---

## Common Issues & Troubleshooting

### Issue: Orders not loading
- Check browser console for API errors
- Verify seller has at least one order in database
- Check `/api/seller/orders` endpoint directly

### Issue: Status actions not appearing
- Verify order is in correct status for transition
- Check `lib/orderState.ts` for valid transition rules
- Ensure seller owns the order (sellerId matches)

### Issue: Self-purchase not blocked
- Clear cart and try again
- Verify product actually belongs to logged-in seller
- Check browser network tab for checkout API response

---

## Test Data Requirements

Minimum test data needed:
- 1 seller account with approved seller profile
- 1 customer account
- At least 3 products (2 from seller 's', 1 from another seller)
- At least 1 order in PAID status
- At least 1 order in SHIPPED status
- At least 1 completed order for historical reference

---

## Automated Test Suggestions

Future E2E tests could cover:
1. Seller order list pagination
2. Concurrent status updates from multiple sellers
3. Refund request flow (when admin approval is implemented)
4. Order search and filtering edge cases
5. Performance testing with large order volumes
