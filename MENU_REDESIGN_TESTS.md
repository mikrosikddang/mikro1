# Menu Redesign Testing Document

## Overview
This document tracks the testing status of the production-grade hamburger menu redesign.

**Created:** 2026-02-17
**Status:** Implementation complete, ready for testing
**Environment:** Local development only (NO git commit/push/deploy)

---

## Components Implemented

### 1. Common Menu Components
**Files:**
- `components/menu/MenuItem.tsx` - Unified menu item (52px height, chevron support)
- `components/menu/MenuSection.tsx` - Section header with consistent typography
- `components/menu/MenuProfileRow.tsx` - Profile/login block with role badges

**Features:**
- ✅ MenuItem: 52px height, 17px font, hover states, optional chevron
- ✅ MenuSection: 12px tracking-widest title, consistent spacing
- ✅ MenuProfileRow: Clickable profile → /my, role badges, login button for guests

### 2. Enhanced LogoutButton
**File:** `components/LogoutButton.tsx`

**Changes:**
- ✅ Added confirm modal: "로그아웃 하시겠어요?" with 취소/로그아웃 buttons
- ✅ Updated drawer variant: 48px height (was 44px), rounded-2xl, 16px font-semibold
- ✅ Modal overlay with black/40 backdrop
- ✅ iOS-style alert dialog with grid layout

### 3. Refactored Drawer
**File:** `components/Drawer.tsx`

**Changes:**
- ✅ Section labels changed to Korean: "둘러보기", "판매자", "관리자", "정보"
- ✅ Category links updated to new 3-depth system: 여성의류, 남성의류
- ✅ Removed old category links (바지, 아우터, etc.)
- ✅ Added chevron to "브랜드 보기"
- ✅ Integrated MenuItem, MenuSection, MenuProfileRow components
- ✅ Role-based visibility already implemented with role helpers
- ✅ Safe area inset for bottom padding

---

## Test Cases

### [UI] Visual Structure

#### TC-UI-01: Header Layout
- **Action:** Open menu
- **Expected:** mikro logo (left) + X button (right), 56px height
- **Status:** ✅ PASS (build verified)

#### TC-UI-02: Segmented Control (Feed/List Toggle)
- **Action:** View toggle below header
- **Expected:** iOS-style segment control, sliding background, 36px height
- **Status:** ✅ PASS (existing HomeFeedViewToggle component)

#### TC-UI-03: Profile Row (Logged In)
- **Action:** Login and open menu
- **Expected:** Avatar circle (8px) + name + role badge + chevron, clickable → /my
- **Status:** ⏳ PENDING (requires manual test)

#### TC-UI-04: Profile Row (Logged Out)
- **Action:** Logout and open menu
- **Expected:** Login icon + "로그인" text, clickable → /login
- **Status:** ⏳ PENDING (requires manual test)

#### TC-UI-05: Section Titles
- **Action:** View all sections
- **Expected:** "둘러보기", "판매자" (seller only), "관리자" (admin only), "정보"
- **Status:** ✅ PASS (code review)

#### TC-UI-06: Menu Items
- **Action:** View menu items
- **Expected:** All items 52px height, 17px font-medium, consistent spacing
- **Status:** ✅ PASS (MenuItem component)

#### TC-UI-07: Chevron Display
- **Action:** View "브랜드 보기"
- **Expected:** Right-pointing chevron visible
- **Status:** ✅ PASS (showChevron=true set)

#### TC-UI-08: Logout Button
- **Action:** View logout button (logged in)
- **Expected:** 48px height, rounded-2xl, 16px font-semibold, gray-100 background
- **Status:** ✅ PASS (code review)

### [PERMISSIONS] Role-Based Visibility

#### TC-PERM-01: Customer Role
- **Action:** Login as CUSTOMER, open menu
- **Expected:** "둘러보기" + "정보" visible, "판매자" + "관리자" hidden
- **Status:** ⏳ PENDING (requires manual test)

#### TC-PERM-02: Seller Role
- **Action:** Login as SELLER_ACTIVE, open menu
- **Expected:** "둘러보기" + "판매자" + "정보" visible, "관리자" hidden
- **Status:** ⏳ PENDING (requires manual test)

#### TC-PERM-03: Admin Role
- **Action:** Login as ADMIN, open menu
- **Expected:** All sections visible ("둘러보기" + "판매자" + "관리자" + "정보")
- **Status:** ⏳ PENDING (requires manual test)

#### TC-PERM-04: Role Helper Usage
- **Action:** Search codebase for role string comparisons
- **Expected:** NO instances of `role === "ADMIN"` or similar string checks
- **Status:** ✅ PASS (uses canAccessSellerFeatures, isAdmin helpers)

### [TOGGLE] Feed/List Mode

#### TC-TOGGLE-01: Toggle Change
- **Action:** Click "피드" or "리스트" in menu
- **Expected:** Selection changes, localStorage updated
- **Status:** ⏳ PENDING (existing HomeFeedViewToggle, needs manual test)

#### TC-TOGGLE-02: Home Reflection
- **Action:** Toggle mode, close menu, view home
- **Expected:** Home page displays in selected mode (feed or carrot list)
- **Status:** ⏳ PENDING (requires manual test)

#### TC-TOGGLE-03: State Persistence
- **Action:** Toggle mode, close menu, reopen menu
- **Expected:** Toggle remains in selected state
- **Status:** ⏳ PENDING (requires manual test)

### [LOGOUT] Logout Flow

#### TC-LOGOUT-01: Logout Button Click
- **Action:** Click "로그아웃" button
- **Expected:** Confirm modal appears with "로그아웃 하시겠어요?" title
- **Status:** ⏳ PENDING (requires manual test)

#### TC-LOGOUT-02: Logout Cancel
- **Action:** Click "취소" in confirm modal
- **Expected:** Modal closes, user remains logged in
- **Status:** ⏳ PENDING (requires manual test)

#### TC-LOGOUT-03: Logout Confirm
- **Action:** Click "로그아웃" in confirm modal
- **Expected:** User logged out, redirected to home, menu closes
- **Status:** ⏳ PENDING (requires manual test)

### [NAVIGATION] Category Links

#### TC-NAV-01: 여성의류 Link
- **Action:** Click "여성의류"
- **Expected:** Navigate to `/?main=여성의류`, menu closes, products filtered
- **Status:** ⏳ PENDING (requires manual test)

#### TC-NAV-02: 남성의류 Link
- **Action:** Click "남성의류"
- **Expected:** Navigate to `/?main=남성의류`, menu closes, products filtered
- **Status:** ⏳ PENDING (requires manual test)

#### TC-NAV-03: 브랜드 보기 Link
- **Action:** Click "브랜드 보기"
- **Expected:** Navigate to `/brands`, menu closes
- **Status:** ⏳ PENDING (requires manual test)

#### TC-NAV-04: Profile Click (Logged In)
- **Action:** Click profile row
- **Expected:** Navigate to `/my`, menu closes
- **Status:** ⏳ PENDING (requires manual test)

### [REGRESSION] Existing Functionality

#### TC-REG-01: Menu Open/Close
- **Action:** Click hamburger icon, then X button
- **Expected:** Menu opens/closes smoothly, body scroll locked/unlocked
- **Status:** ⏳ PENDING (existing logic preserved)

#### TC-REG-02: Route Change Auto-Close
- **Action:** Open menu, click any link
- **Expected:** Menu closes automatically on navigation
- **Status:** ⏳ PENDING (existing useEffect preserved)

#### TC-REG-03: Build Check
- **Action:** Run `npm run build`
- **Expected:** Build succeeds
- **Status:** ✅ PASS

#### TC-REG-04: Type Check
- **Action:** Run `npx tsc --noEmit`
- **Expected:** No type errors
- **Status:** ✅ PASS

---

## Build & Type Check Results

### Type Check
```bash
npx tsc --noEmit
```
**Status:** ✅ PASS
**Output:** No type errors found.

### Build Test
```bash
npm run build
```
**Status:** ✅ PASS
**Output:**
```
Creating an optimized production build ...
✓ Compiled successfully in 1916.4ms
```

---

## Manual Testing Checklist

To complete testing, perform the following in local dev server (`http://localhost:3000`):

1. **Guest User:**
   - [ ] Open menu → verify "로그인" button appears
   - [ ] Click "로그인" → redirects to /login
   - [ ] Verify sections: only "둘러보기" + "정보" visible

2. **Logged In Customer:**
   - [ ] Open menu → verify profile row with role badge "고객"
   - [ ] Click profile row → navigate to /my
   - [ ] Verify sections: "둘러보기" + "정보" visible, no "판매자"/"관리자"
   - [ ] Click logout → confirm modal appears → cancel → still logged in
   - [ ] Click logout → confirm modal → logout → logged out + redirected

3. **Logged In Seller:**
   - [ ] Open menu → verify profile row with badge "판매자"
   - [ ] Verify sections: "둘러보기" + "판매자" + "정보" visible, no "관리자"
   - [ ] Click "상품 관리" → navigate to /seller/products

4. **Logged In Admin:**
   - [ ] Open menu → verify profile row with badge "관리자"
   - [ ] Verify all sections visible including "관리자"
   - [ ] Click "판매자 승인" → navigate to /admin/sellers

5. **Toggle & Navigation:**
   - [ ] Toggle feed/list → home page changes mode
   - [ ] Click "여성의류" → home filters by 여성의류
   - [ ] Click "남성의류" → home filters by 남성의류
   - [ ] Click "브랜드 보기" → navigate to /brands

---

## Summary

### Completed ✅
- [x] Common menu components (MenuItem, MenuSection, MenuProfileRow)
- [x] Section labels changed to Korean
- [x] Category links updated to 3-depth system
- [x] Logout confirm modal added
- [x] LogoutButton styling updated (48px, rounded-2xl, 16px font-semibold)
- [x] Role-based visibility using role helpers
- [x] Safe area inset support
- [x] Type check passed
- [x] Build check passed

### Pending ⏳
- [ ] Manual testing with different user roles
- [ ] Toggle functionality verification
- [ ] Logout flow testing
- [ ] Category navigation testing
- [ ] Profile click navigation testing

### Next Steps
1. Start dev server: `npm run dev`
2. Test as guest, customer, seller, admin
3. Verify all navigation links
4. Test logout with confirm modal
5. Test feed/list toggle

---

**Note:** All work is LOCAL ONLY. NO git commit, push, or deployment until user approval.
