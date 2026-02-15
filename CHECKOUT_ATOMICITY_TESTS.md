# Checkout Atomicity Tests - TRACK 3

## Test Matrix for POST /api/checkout/create-orders

### Prerequisites
- Test user: CUSTOMER (id="1", pw="1")
- Test seller: SELLER (id="s", pw="s")
- At least 2 products with variants from different sellers
- Valid address created for the customer

---

## Test 1: Happy Path - Single Seller

**Setup:**
1. Login as CUSTOMER
2. Add 2 variants from same seller to cart
3. Create address (addressId = "addr1")
4. Generate checkoutAttemptId = "attempt-001"

**Test:**
```
POST /api/checkout/create-orders
{
  "checkoutAttemptId": "attempt-001",
  "addressId": "addr1"
}
```

**Expected Result:**
- 200 OK
- Response:
  ```json
  {
    "ok": true,
    "idempotent": false,
    "orders": [{ ...order with 2 items... }],
    "removedCartItems": []
  }
  ```
- 1 Order created with status PENDING
- 2 OrderItems created
- Order has:
  - `checkoutAttemptId` = "attempt-001"
  - `itemsSubtotalKrw` = sum of (priceKrw * quantity)
  - `shippingFeeKrw` calculated from seller profile
  - `totalPayKrw` = itemsSubtotalKrw + shippingFeeKrw
  - `expiresAt` set to ~30 minutes from now
  - `shipToName`, `shipToPhone`, etc. copied from address
- Cart items NOT deleted (stays until payment)
- Stock NOT deducted

**DB State Check:**
```sql
-- Order exists
SELECT * FROM "Order" WHERE "checkoutAttemptId" = 'attempt-001';

-- Cart items still exist
SELECT COUNT(*) FROM "CartItem" WHERE "userId" = '1';
-- Expected: 2

-- Stock unchanged
SELECT stock FROM "ProductVariant" WHERE id = '<variantId>';
-- Expected: Original stock value
```

---

## Test 2: Multiple Sellers - Grouping

**Setup:**
1. Login as CUSTOMER
2. Add 2 variants from seller A
3. Add 1 variant from seller B
4. Generate checkoutAttemptId = "attempt-002"

**Test:**
```
POST /api/checkout/create-orders
{
  "checkoutAttemptId": "attempt-002",
  "addressId": "addr1"
}
```

**Expected Result:**
- 200 OK
- 2 Orders created (one per seller)
- Each order:
  - Has correct sellerId
  - Has correct items
  - Has independent shipping fee calculation
  - Has same checkoutAttemptId
- Total 3 OrderItems created
- Cart items NOT deleted

**DB State Check:**
```sql
-- Two orders created
SELECT COUNT(*) FROM "Order" WHERE "checkoutAttemptId" = 'attempt-002';
-- Expected: 2

-- Both orders are PENDING
SELECT COUNT(*) FROM "Order"
WHERE "checkoutAttemptId" = 'attempt-002' AND status = 'PENDING';
-- Expected: 2

-- Orders have different sellers
SELECT DISTINCT "sellerId" FROM "Order" WHERE "checkoutAttemptId" = 'attempt-002';
-- Expected: 2 rows
```

---

## Test 3: Idempotency - Duplicate Request

**Setup:**
1. Complete Test 1 successfully (attempt-001)
2. Call the same endpoint again with same checkoutAttemptId

**Test:**
```
POST /api/checkout/create-orders
{
  "checkoutAttemptId": "attempt-001",
  "addressId": "addr1"
}
```

**Expected Result:**
- 200 OK
- Response:
  ```json
  {
    "ok": true,
    "idempotent": true,
    "orders": [{ ...same order as before... }],
    "removedCartItems": []
  }
  ```
- NO new orders created
- Returns existing orders
- No errors thrown

**DB State Check:**
```sql
-- Still only 1 order
SELECT COUNT(*) FROM "Order" WHERE "checkoutAttemptId" = 'attempt-001';
-- Expected: 1

-- OrderItems unchanged
SELECT COUNT(*) FROM "OrderItem" WHERE "orderId" IN (
  SELECT id FROM "Order" WHERE "checkoutAttemptId" = 'attempt-001'
);
-- Expected: 2 (same as Test 1)
```

---

## Test 4: Auto-Cleanup - Orphaned Variants

**Setup:**
1. Login as CUSTOMER
2. Add 2 variants to cart
3. Manually delete one variant from DB (bypass API):
   ```sql
   DELETE FROM "ProductVariant" WHERE id = '<variantId1>';
   ```
4. Now cart has 1 valid item and 1 orphaned item

**Test:**
```
POST /api/checkout/create-orders
{
  "checkoutAttemptId": "attempt-004",
  "addressId": "addr1"
}
```

**Expected Result:**
- 200 OK
- Response includes: `"removedCartItems": ["1 invalid items removed"]`
- 1 Order created with only the valid item
- Orphaned CartItem deleted automatically
- No error thrown

**DB State Check:**
```sql
-- Orphaned cart item removed
SELECT COUNT(*) FROM "CartItem" WHERE "variantId" = '<deletedVariantId>';
-- Expected: 0

-- Valid cart item still exists (until payment)
SELECT COUNT(*) FROM "CartItem" WHERE "variantId" = '<validVariantId>';
-- Expected: 1

-- Order created with only valid item
SELECT COUNT(*) FROM "OrderItem" WHERE "orderId" IN (
  SELECT id FROM "Order" WHERE "checkoutAttemptId" = 'attempt-004'
);
-- Expected: 1
```

---

## Test 5: Auto-Cleanup - Deleted/Inactive Products

**Setup:**
1. Login as CUSTOMER
2. Add 3 variants to cart
3. Set one product to isDeleted=true
4. Set one product to isActive=false

**Test:**
```
POST /api/checkout/create-orders
{
  "checkoutAttemptId": "attempt-005",
  "addressId": "addr1"
}
```

**Expected Result:**
- 200 OK
- Response includes: `"removedCartItems": ["2 invalid items removed"]`
- 1 Order created with only the active item
- 2 CartItems auto-deleted
- No error thrown

**DB State Check:**
```sql
-- Invalid cart items removed
SELECT COUNT(*) FROM "CartItem" WHERE "userId" = '1';
-- Expected: 1 (only valid item remains)

-- Order has only valid item
SELECT COUNT(*) FROM "OrderItem" WHERE "orderId" IN (
  SELECT id FROM "Order" WHERE "checkoutAttemptId" = 'attempt-005'
);
-- Expected: 1
```

---

## Test 6: OUT_OF_STOCK Validation

**Setup:**
1. Login as CUSTOMER
2. Add variant with stock=5 to cart
3. Set CartItem quantity=10 (exceeds stock)

**Test:**
```
POST /api/checkout/create-orders
{
  "checkoutAttemptId": "attempt-006",
  "addressId": "addr1"
}
```

**Expected Result:**
- 409 Conflict
- Response:
  ```json
  {
    "error": "OUT_OF_STOCK: 청바지 (M): requested 10, available 5"
  }
  ```
- NO orders created
- Cart unchanged
- Stock unchanged

**DB State Check:**
```sql
-- No order created
SELECT COUNT(*) FROM "Order" WHERE "checkoutAttemptId" = 'attempt-006';
-- Expected: 0

-- Cart item unchanged
SELECT quantity FROM "CartItem" WHERE "variantId" = '<variantId>';
-- Expected: 10

-- Stock unchanged
SELECT stock FROM "ProductVariant" WHERE id = '<variantId>';
-- Expected: 5
```

---

## Test 7: CART_EMPTY Error

**Setup:**
1. Login as CUSTOMER
2. Empty cart (no items)

**Test:**
```
POST /api/checkout/create-orders
{
  "checkoutAttemptId": "attempt-007",
  "addressId": "addr1"
}
```

**Expected Result:**
- 400 Bad Request
- Response:
  ```json
  {
    "error": "CART_EMPTY: No items in cart"
  }
  ```
- NO orders created

---

## Test 8: CART_ITEM_INVALID_REMOVED Error

**Setup:**
1. Login as CUSTOMER
2. Add 2 variants to cart
3. Delete both products (isDeleted=true)

**Test:**
```
POST /api/checkout/create-orders
{
  "checkoutAttemptId": "attempt-008",
  "addressId": "addr1"
}
```

**Expected Result:**
- 409 Conflict
- Response:
  ```json
  {
    "error": "CART_ITEM_INVALID_REMOVED: All cart items were invalid and removed"
  }
  ```
- NO orders created
- Both CartItems deleted

**DB State Check:**
```sql
-- Cart is now empty
SELECT COUNT(*) FROM "CartItem" WHERE "userId" = '1';
-- Expected: 0
```

---

## Test 9: ADDRESS_INVALID Error

**Setup:**
1. Login as CUSTOMER
2. Add variants to cart
3. Use non-existent addressId

**Test:**
```
POST /api/checkout/create-orders
{
  "checkoutAttemptId": "attempt-009",
  "addressId": "fake-address-id"
}
```

**Expected Result:**
- 400 Bad Request
- Response:
  ```json
  {
    "error": "ADDRESS_INVALID: Address not found"
  }
  ```
- NO orders created
- Cart unchanged

---

## Test 10: Shipping Fee Calculation

**Setup:**
1. Create seller with:
   - shippingFeeKrw = 3000
   - freeShippingThreshold = 50000
2. Add variants with total price = 45000 (below threshold)

**Test:**
```
POST /api/checkout/create-orders
{
  "checkoutAttemptId": "attempt-010a",
  "addressId": "addr1"
}
```

**Expected Result:**
- Order created with:
  - itemsSubtotalKrw = 45000
  - shippingFeeKrw = 3000
  - totalPayKrw = 48000

**Setup 2:**
1. Same seller
2. Add variants with total price = 60000 (above threshold)

**Test:**
```
POST /api/checkout/create-orders
{
  "checkoutAttemptId": "attempt-010b",
  "addressId": "addr1"
}
```

**Expected Result:**
- Order created with:
  - itemsSubtotalKrw = 60000
  - shippingFeeKrw = 0 (free shipping)
  - totalPayKrw = 60000

---

## Test 11: Order Expiration Set

**Setup:**
1. Complete Test 1
2. Check expiresAt timestamp

**Expected Result:**
- Order has `expiresAt` set to approximately 30 minutes from creation
- `expiresAt` should be within 29-31 minutes from now

**DB State Check:**
```sql
SELECT "expiresAt", "createdAt" FROM "Order" WHERE "checkoutAttemptId" = 'attempt-001';
-- Calculate: expiresAt - createdAt should be ~30 minutes
```

---

## Test 12: Cart Cleanup After Payment

**Setup:**
1. Create orders using Test 1 (checkoutAttemptId="attempt-012")
2. Simulate payment success

**Test:**
```
POST /api/payments/simulate
{
  "orderIds": ["<orderId from attempt-012>"]
}
```

**Expected Result:**
- Payment succeeds
- Stock deducted
- Order status → PAID
- **Cart cleared automatically**

**DB State Check:**
```sql
-- Cart is now empty
SELECT COUNT(*) FROM "CartItem" WHERE "userId" = '1';
-- Expected: 0
```

---

## Test 13: Transaction Rollback on Error

**Setup:**
1. Login as CUSTOMER
2. Add 2 variants to cart (both valid)
3. Manually set one variant stock to negative (bypass validation):
   ```sql
   UPDATE "ProductVariant" SET stock = -1 WHERE id = '<variantId>';
   ```

**Test:**
```
POST /api/checkout/create-orders
{
  "checkoutAttemptId": "attempt-013",
  "addressId": "addr1"
}
```

**Expected Result:**
- Error thrown (stock validation fails)
- Transaction rolled back:
  - NO orders created
  - NO order items created
  - Cart unchanged
  - Database state unchanged

**DB State Check:**
```sql
-- No orders created
SELECT COUNT(*) FROM "Order" WHERE "checkoutAttemptId" = 'attempt-013';
-- Expected: 0

-- Cart unchanged
SELECT COUNT(*) FROM "CartItem" WHERE "userId" = '1';
-- Expected: 2 (original items still there)
```

---

## Summary Checklist

| Test | Description | Expected Result | Status |
|------|-------------|-----------------|--------|
| 1 | Happy path - single seller | 1 order created, cart preserved | ☐ |
| 2 | Multiple sellers | 2 orders grouped by seller | ☐ |
| 3 | Idempotency | Same request returns existing orders | ☐ |
| 4 | Auto-cleanup orphaned variants | Invalid items removed silently | ☐ |
| 5 | Auto-cleanup deleted products | Invalid items removed silently | ☐ |
| 6 | OUT_OF_STOCK validation | 409 error, no order created | ☐ |
| 7 | Empty cart | 400 CART_EMPTY | ☐ |
| 8 | All items invalid | 409 CART_ITEM_INVALID_REMOVED | ☐ |
| 9 | Invalid address | 400 ADDRESS_INVALID | ☐ |
| 10 | Shipping fee calculation | Free shipping threshold works | ☐ |
| 11 | Order expiration | expiresAt set to +30 mins | ☐ |
| 12 | Cart cleanup after payment | Cart cleared on payment success | ☐ |
| 13 | Transaction rollback | Error → full rollback | ☐ |

---

## Post-Test Validation

After running all tests, verify:

```bash
# Run integrity audit
node scripts/variant-integrity-audit.mjs

# Expected: ✅ AUDIT PASSED

# Check for orphaned cart items
# SQL:
SELECT c.* FROM "CartItem" c
LEFT JOIN "ProductVariant" v ON c."variantId" = v.id
WHERE v.id IS NULL;
-- Expected: 0 rows

# Check order data integrity
SELECT COUNT(*) FROM "Order" WHERE "checkoutAttemptId" IS NOT NULL;
-- Expected: Number of successful test orders

# Verify no orders without items
SELECT o.id FROM "Order" o
LEFT JOIN "OrderItem" oi ON o.id = oi."orderId"
WHERE oi.id IS NULL;
-- Expected: 0 rows
```

---

## Rollback Plan

If tests fail:
1. Check transaction boundaries - all operations must be in single `$transaction`
2. Verify error handling - all throws should trigger rollback
3. Inspect database state with SQL queries above
4. Check Prisma logs for transaction errors
5. Verify idempotency logic - checkoutAttemptId uniqueness

---

## Integration with Existing Flow

**Before TRACK 3:**
- POST /api/orders (old endpoint)
- Direct order creation from cart
- No idempotency
- No auto-cleanup

**After TRACK 3:**
- POST /api/checkout/create-orders (new endpoint)
- Atomic transaction with validation
- Idempotency via checkoutAttemptId
- Auto-cleanup of invalid items
- Cart preserved until payment success
- Stock deduction only on payment confirm

**Migration Path:**
1. Frontend switches to new endpoint
2. Old endpoint kept for backward compatibility
3. Both endpoints co-exist during transition
4. Old endpoint can be deprecated after full migration
