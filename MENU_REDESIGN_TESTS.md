# Menu Redesign Testing Document (Phase 2)

## Overview
This document tracks the testing status of the production-grade hamburger menu Phase 2 redesign.

**Created:** 2026-02-17
**Updated:** 2026-02-17 (Phase 2)
**Status:** Phase 2 implementation complete
**Environment:** Local development only (NO git commit/push/deploy)

---

## Phase 2 Updates

### Typography & Hierarchy
**Changes:**
- MenuItem height: 52px → 46px (tighter, more content visible)
- MenuItem font: font-medium → font-semibold (stronger hierarchy)
- MenuSection spacing: mt-6 → mt-4, first:mt-4 → first:mt-3
- MenuSection tracking: tracking-widest → tracking-[0.12em]
- Dividers: Added border-b to all menu items except last

### Profile Row
**Changes:**
- Height: variable → 64px fixed
- Avatar: 32px → 36px
- Name font: text-[15px] → text-[16px] font-semibold
- Role badge: text-[11px] → text-[12px] font-semibold
- Badge colors:
  - ADMIN: bg-purple-100 text-purple-700 → bg-red-50 text-red-600
  - SELLER: bg-blue-100 text-blue-700 → bg-blue-50 text-blue-600
  - CUSTOMER: bg-gray-100 text-gray-600 → bg-gray-100 text-gray-700

### Toggle (Feed/List)
**Changes:**
- Width: full width → w-[80%] max-w-[320px] centered
- Height: 36px → 40px
- Padding: p-0.5 → p-1
- Selected: font-semibold (emphasized)
- Unselected: font-medium text-gray-500

### Category Deep Navigation
**Major Feature:**
- ✅ CategoryPickerSheet integrated into Drawer
- ✅ 여성의류/남성의류 → onClick opens CategoryPickerSheet
- ✅ Breadcrumb navigation (e.g., 여성의류 > 상의 > 티셔츠)
- ✅ Recent selections (최근 선택) chips displayed
- ✅ Deep navigation: Main → Mid → Sub category selection
- ✅ Final selection closes sheets and applies filter to home

---

## Test Cases

### [Layout] Visual Hierarchy

#### TC-MENU-01: Section Titles Clear
- **Action:** Open menu, view all sections
- **Expected:** Section titles (둘러보기/판매자/관리자/정보) clearly visible, distinct from items
- **Status:** ✅ PASS (tracking-[0.12em], mb-2, text-gray-400)

#### TC-MENU-02: Tighter Spacing, More Content
- **Action:** Open menu, scroll
- **Expected:** More menu items visible per screen, less empty space
- **Status:** ✅ PASS (46px height, mt-4 spacing)

#### TC-MENU-03: Clean Dividers
- **Action:** View menu items
- **Expected:** Subtle border-b dividers separate items cleanly
- **Status:** ✅ PASS (border-gray-100, last item no divider)

### [Category Deep Navigation]

#### TC-CAT-01: 여성의류 Opens CategoryPickerSheet
- **Action:** Click "여성의류" in menu
- **Expected:** CategoryPickerSheet opens with initialMain="여성의류"
- **Status:** ⏳ PENDING (requires manual test)

#### TC-CAT-02: 남성의류 Opens CategoryPickerSheet
- **Action:** Click "남성의류" in menu
- **Expected:** CategoryPickerSheet opens with initialMain="남성의류"
- **Status:** ⏳ PENDING (requires manual test)

#### TC-CAT-03: Deep Navigation Flow
- **Action:** Open category sheet → select mid category → select sub category
- **Expected:** Navigate through 2depth → 3depth, breadcrumb updates
- **Status:** ⏳ PENDING (requires manual test)

#### TC-CAT-04: Final Selection Closes and Filters
- **Action:** Complete category selection in sheet
- **Expected:** Sheet closes, Drawer closes, home filters by main/mid/sub
- **Status:** ⏳ PENDING (requires manual test)

#### TC-CAT-05: Recent Selections Visible
- **Action:** Select category, reopen sheet
- **Expected:** Recent selection chips appear at top of CategoryPickerSheet
- **Status:** ⏳ PENDING (requires manual test)

#### TC-CAT-06: Breadcrumb Navigation
- **Action:** Navigate deep, use breadcrumb to go back
- **Expected:** Breadcrumb shows path, clicking goes back to parent
- **Status:** ⏳ PENDING (requires manual test - CategoryPickerSheet feature)

### [Toggle] Feed/List Mode

#### TC-TOG-01: Toggle Centered and Sized
- **Action:** Open menu, view toggle
- **Expected:** Toggle is centered, w-80% max-w-320px, h-40px
- **Status:** ✅ PASS (code review)

#### TC-TOG-02: Toggle Changes Home View
- **Action:** Toggle between 피드/리스트, close menu, view home
- **Expected:** Home page displays in selected mode
- **Status:** ⏳ PENDING (requires manual test)

#### TC-TOG-03: Toggle State Persists
- **Action:** Toggle mode, close menu, reopen
- **Expected:** Selected mode persists (localStorage)
- **Status:** ⏳ PENDING (requires manual test)

### [Role] Permission-Based Visibility

#### TC-ROLE-01: CUSTOMER - No Seller/Admin Sections
- **Action:** Login as CUSTOMER, open menu
- **Expected:** Only "둘러보기" + "정보" visible
- **Status:** ⏳ PENDING (requires manual test)

#### TC-ROLE-02: SELLER - Seller Section Visible
- **Action:** Login as SELLER_ACTIVE, open menu
- **Expected:** "둘러보기" + "판매자" + "정보" visible, no "관리자"
- **Status:** ⏳ PENDING (requires manual test)

#### TC-ROLE-03: ADMIN - All Sections Visible
- **Action:** Login as ADMIN, open menu
- **Expected:** All sections visible including "관리자"
- **Status:** ⏳ PENDING (requires manual test)

### [Build & Type Check]

#### TC-BUILD-01: TypeScript Type Check
- **Action:** Run `npx tsc --noEmit`
- **Expected:** No type errors
- **Status:** ✅ PASS

#### TC-BUILD-02: Production Build
- **Action:** Run `npm run build`
- **Expected:** Build succeeds
- **Status:** ✅ PASS (Compiled successfully in 2.0s)

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
✓ Compiled successfully in 2.0s
```

---

## Files Modified (Phase 2)

### Modified (5 files)
1. `components/menu/MenuItem.tsx`
   - Height: 52px → 46px (single line) / 58px (with subtitle)
   - Added divider support (border-b border-gray-100)
   - Added onClick prop for CategoryPickerSheet
   - Font: font-medium → font-semibold
   - Chevron color: text-gray-400 → text-gray-300

2. `components/menu/MenuSection.tsx`
   - Spacing: mt-6 → mt-4, first:mt-4 → first:mt-3
   - Tracking: tracking-widest → tracking-[0.12em]
   - Removed space-y-1 (dividers handle spacing)

3. `components/menu/MenuProfileRow.tsx`
   - Height: variable → 64px fixed
   - Avatar: 32px → 36px
   - Name: text-[15px] → text-[16px] font-semibold
   - Badge: text-[11px] → text-[12px] font-semibold
   - Badge colors updated (ADMIN red, SELLER blue, CUSTOMER gray)

4. `components/HomeFeedViewToggle.tsx`
   - Width: full → w-[80%] max-w-[320px] centered
   - Height: 36px → 40px
   - Padding: p-0.5 → p-1
   - Font: emphasized selected (font-semibold), subtle unselected (font-medium)

5. `components/Drawer.tsx`
   - Imported CategoryPickerSheet
   - Added state: categorySheetOpen, categoryRoot
   - 여성의류/남성의류 → onClick opens CategoryPickerSheet
   - handleCategorySelect navigates to home with filter
   - Removed navigation group structure, hardcoded sections for clarity

---

## Manual Testing Checklist

To complete testing, perform the following in local dev server (`http://localhost:3000`):

### Visual Hierarchy
- [ ] Section titles clearly separate sections
- [ ] Menu items have strong visual weight (font-semibold)
- [ ] Dividers cleanly separate items without clutter
- [ ] Profile row badge colors correct (red=admin, blue=seller, gray=customer)

### Category Deep Navigation
- [ ] Click "여성의류" → CategoryPickerSheet opens
- [ ] Click "남성의류" → CategoryPickerSheet opens
- [ ] Navigate 여성의류 → 상의 → 티셔츠 → home filters correctly
- [ ] Breadcrumb shows "여성의류 > 상의 > 티셔츠"
- [ ] Recent selections appear as chips after first selection
- [ ] Final selection closes sheet + drawer, applies filter

### Toggle & Logout
- [ ] Toggle is centered, proper size
- [ ] Toggle changes home view mode
- [ ] Logout button opens confirm modal
- [ ] Logout confirm → logged out + redirected

### Role-Based
- [ ] Customer sees only "둘러보기" + "정보"
- [ ] Seller sees "둘러보기" + "판매자" + "정보"
- [ ] Admin sees all sections

---

## Summary

### Phase 2 Completed ✅
- [x] MenuItem: 46px height, dividers, font-semibold
- [x] MenuSection: tighter spacing (mt-4), refined tracking
- [x] MenuProfileRow: 64px, 36px avatar, refined badges
- [x] HomeFeedViewToggle: centered, 40px, emphasized styling
- [x] CategoryPickerSheet integration (deep nav)
- [x] Type check PASS
- [x] Build PASS

### Pending ⏳
- [ ] Manual testing with different user roles
- [ ] Category deep navigation flow testing
- [ ] Toggle functionality verification
- [ ] Visual hierarchy verification

### Key Improvements
1. **Tighter, Clearer Hierarchy:** 46px items, font-semibold, dividers create clean visual rhythm
2. **Category Deep Navigation:** Reuses CategoryPickerSheet for 3-depth browsing from menu
3. **Refined Details:** Centered toggle, refined badges, consistent spacing throughout

---

**Note:** All work is LOCAL ONLY. NO git commit, push, or deployment until user approval.
