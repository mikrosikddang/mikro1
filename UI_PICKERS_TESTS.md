# UI Pickers Testing Document

## Overview

This document tracks the testing status of the new UX components for category selection, color selection, and color-specific image management.

**Created:** 2026-02-17
**Status:** Components ready for integration testing
**Environment:** Local development only (NO git commit/push/deploy)

---

## Components Implemented

### 1. Category Picker (3-Depth Hierarchy)
**Files:**
- `lib/categories.ts` - Category tree with 여성의류/남성의류 (expanded with shoes, bags, accessories)
- `components/CategoryPickerSheet.tsx` - Bottom sheet UI with breadcrumb and recent selections

**Features:**
- ✅ 3-depth selection: Main (Gender) → Mid (Category) → Sub (Detail)
- ✅ Breadcrumb display (e.g., "여성의류 > 상의 > 티셔츠")
- ✅ Recent selections (localStorage, max 6 items)
- ✅ Accordion-style expansion for mid categories
- ✅ Red highlight for selected items
- ✅ Validation with `validateCategory()`

**Categories Coverage:**
- 여성의류: 10 mid-categories (상의, 아우터, 하의, 스커트, 원피스, 언더웨어/홈웨어, 비치웨어, 신발, 가방, 액세서리)
- 남성의류: 8 mid-categories (상의, 아우터, 하의, 수트/셋업, 언더웨어, 신발, 가방, 액세서리)

### 2. Color Picker (Favorites/Recent/Search)
**Files:**
- `lib/colors.ts` - Color groups and color data (9 groups, ~50 colors)
- `lib/colorStorage.ts` - localStorage management for favorites/recent/searches
- `components/ColorPickerSheet.tsx` - Tab-based color selection UI

**Features:**
- ✅ 2 main tabs: "나만의 색상" / "기본 색상"
- ✅ Color groups: 그레이, 옐로우/베이지, 오렌지, 레드/핑크, 그린, 블루, 퍼플, 브라운, 블랙/화이트
- ✅ Favorite colors (star toggle, localStorage)
- ✅ Recent selections (localStorage, max 8 items)
- ✅ Search with recent queries (localStorage, max 10 items)
- ✅ Square color cards with color chip + label + favorite button

### 3. Color Image Manager (Per-Color Images)
**Files:**
- `components/ColorImageManager.tsx` - Color-specific image upload UI
- `prisma/schema.prisma` - Added `colorKey` field to ProductImage model

**Features:**
- ✅ Color tabs (shows all variant colors)
- ✅ Max 5 images per color
- ✅ Upload validation (type, size)
- ✅ Image deletion
- ✅ Uses existing S3 upload flow (`/api/uploads/presign`)
- ✅ Save/Cancel actions

**Database Changes:**
- ✅ `ProductImage.colorKey` field added (String?, nullable)
- ✅ `prisma db push` executed successfully
- ✅ `prisma generate` completed

---

## Test Cases

### [CATEGORY] Category Selection

#### TC-CAT-01: Open Category Picker
- **Action:** Click category field in product form
- **Expected:** CategoryPickerSheet opens
- **Status:** ⏳ PENDING (requires ProductForm integration)

#### TC-CAT-02: Select Category Path
- **Action:** Select 여성의류 → 상의 → 티셔츠
- **Expected:** Form displays "여성의류 > 상의 > 티셔츠"
- **Status:** ⏳ PENDING

#### TC-CAT-03: Breadcrumb Navigation
- **Action:** Select main, mid, then use breadcrumb to go back
- **Expected:** Breadcrumb updates, can navigate back
- **Status:** ⏳ PENDING

#### TC-CAT-04: Close Without Selection
- **Action:** Open sheet, press X without selecting
- **Expected:** Sheet closes, no changes to form
- **Status:** ⏳ PENDING

#### TC-CAT-05: Recent Selections Storage
- **Action:** Select category, close, reopen
- **Expected:** Recent selection chip appears at top
- **Status:** ⏳ PENDING

#### TC-CAT-06: Recent Selection Click
- **Action:** Click recent selection chip
- **Expected:** Category selected immediately, sheet closes
- **Status:** ⏳ PENDING

### [COLOR] Color Selection

#### TC-COL-01: Open Color Picker
- **Action:** Open ColorPickerSheet
- **Expected:** Sheet opens with tabs visible
- **Status:** ✅ PASS (component rendered)

#### TC-COL-02: Basic Colors Tab - Group Selection
- **Action:** Select "그레이" group in basic colors tab
- **Expected:** Gray color list appears
- **Status:** ✅ PASS (tested in isolation)

#### TC-COL-03: Toggle Favorite
- **Action:** Click star icon on a color
- **Expected:** Color appears in "나만의 색상" > "즐겨찾는 색상"
- **Status:** ⏳ PENDING (requires localStorage testing)

#### TC-COL-04: Recent Colors Accumulation
- **Action:** Select colors multiple times
- **Expected:** Recent colors section shows last 8, no duplicates, newest first
- **Status:** ⏳ PENDING

#### TC-COL-05: Search Icon
- **Action:** Click search icon (magnifying glass)
- **Expected:** Search view appears with input field
- **Status:** ⏳ PENDING

#### TC-COL-06: Search Query
- **Action:** Type "그레이" in search
- **Expected:** Matching colors displayed
- **Status:** ⏳ PENDING

#### TC-COL-07: Recent Searches Storage
- **Action:** Search for "핑크", then reopen search
- **Expected:** "핑크" appears in recent searches
- **Status:** ⏳ PENDING

#### TC-COL-08: Remove Recent Search
- **Action:** Click X button on recent search
- **Expected:** Item removed from list
- **Status:** ⏳ PENDING

#### TC-COL-09: Clear All Searches
- **Action:** Click "전체삭제"
- **Expected:** All recent searches removed
- **Status:** ⏳ PENDING

#### TC-COL-10: Select Color from Search
- **Action:** Search, then click a color
- **Expected:** Color selected, added to recent, sheet closes
- **Status:** ⏳ PENDING

#### TC-COL-11: Color Card Display
- **Action:** View color cards
- **Expected:** Square cards with left color chip, center label, right star
- **Status:** ✅ PASS (UI rendered correctly)

### [IMAGE] Color-Specific Images

#### TC-IMG-01: Access Color Image Manager
- **Action:** Product with 2+ colors, click "색상별 이미지 설정"
- **Expected:** ColorImageManager opens
- **Status:** ⏳ PENDING (requires ProductForm integration)

#### TC-IMG-02: Switch Color Tabs
- **Action:** Click different color tabs
- **Expected:** Images switch to selected color
- **Status:** ⏳ PENDING

#### TC-IMG-03: Upload 5 Images
- **Action:** Upload 5 images for color A
- **Expected:** All uploaded successfully
- **Status:** ⏳ PENDING

#### TC-IMG-04: Upload 6th Image (Blocked)
- **Action:** Try to upload 6th image
- **Expected:** Blocked with alert message
- **Status:** ⏳ PENDING

#### TC-IMG-05: Color Separation
- **Action:** Upload images for color A, switch to color B, upload different images
- **Expected:** Images separated by color
- **Status:** ⏳ PENDING

#### TC-IMG-06: Save and Re-edit
- **Action:** Save color images, close, reopen product edit
- **Expected:** Images persist and reload correctly
- **Status:** ⏳ PENDING

#### TC-IMG-07: Image Deletion
- **Action:** Click X on image thumbnail
- **Expected:** Image removed from list
- **Status:** ⏳ PENDING

### [INTEGRATION] Product Form Integration

#### TC-INT-01: Product Creation Flow
- **Action:** Create new product with categories and colors
- **Expected:** All pickers work, data saved correctly
- **Status:** ⏳ PENDING

#### TC-INT-02: Product Edit Flow
- **Action:** Edit existing product
- **Expected:** Existing data loads, changes save
- **Status:** ⏳ PENDING

#### TC-INT-03: Validation
- **Action:** Try to save without selecting category
- **Expected:** Validation error shown
- **Status:** ⏳ PENDING

### [REGRESSION] Existing Functionality

#### TC-REG-01: Existing Product Save
- **Action:** Save product with old data structure
- **Expected:** No errors, backward compatible
- **Status:** ⏳ PENDING

#### TC-REG-02: Build Check
- **Action:** Run `npm run build`
- **Expected:** Build succeeds
- **Status:** ✅ PASS

#### TC-REG-03: Type Check
- **Action:** Run `npx tsc --noEmit`
- **Expected:** No type errors
- **Status:** ✅ PASS

---

## Build & Type Check Results

### Build Test
```bash
npm run build
```
**Status:** ✅ PASS
**Output:**
```
Creating an optimized production build ...
✓ Compiled successfully in 1885.5ms
```
All routes compiled successfully. No build errors.

### Type Check
```bash
npx tsc --noEmit
```
**Status:** ✅ PASS
**Output:** No type errors found.

**Note:** Fixed ActionSheet component to support `headerRight` prop for ColorPickerSheet search icon.

---

## Integration Notes

### ProductForm Integration Status
The following components are ready but **NOT YET INTEGRATED** into ProductForm:

1. **CategoryPickerSheet** - Ready to replace category dropdown
2. **ColorPickerSheet** - Ready to replace PRESET_COLORS dropdown
3. **ColorImageManager** - Ready to add as new feature

### Required ProductForm Changes
To complete integration, ProductForm needs:

1. **Category Selection:**
   ```tsx
   // Replace dropdown with:
   <button onClick={() => setCategoryPickerOpen(true)}>
     {getCategoryBreadcrumb(categoryMain, categoryMid, categorySub)}
   </button>
   <CategoryPickerSheet ... />
   ```

2. **Color Selection (per ColorGroup):**
   ```tsx
   // Replace PRESET_COLORS dropdown with:
   <button onClick={() => openColorPicker(groupIndex)}>
     {colorGroup.color || "색상 선택"}
   </button>
   <ColorPickerSheet ... />
   ```

3. **Color Images Button (show if variants.length >= 2):**
   ```tsx
   {variantTree.length >= 2 && (
     <button onClick={() => setColorImageManagerOpen(true)}>
       색상별 이미지 설정
     </button>
   )}
   ```

### API Updates Required
The product creation/update APIs need to:

1. Accept `colorImages: ColorImageData[]` in request body
2. Save ProductImage records with `colorKey` field set

---

## Local Testing URLs

- **Product Creation:** `/seller/products/new`
- **Product Edit:** `/seller/products/[id]/edit`
- **Dev Server:** `http://localhost:3000`

---

## Summary

### Completed ✅
- [x] Category tree expansion (신발, 가방, 액세서리 added)
- [x] CategoryPickerSheet with recent selections
- [x] lib/colors.ts with 9 color groups
- [x] lib/colorStorage.ts for localStorage
- [x] ColorPickerSheet with tabs/search/favorites
- [x] ProductImage.colorKey schema field
- [x] ColorImageManager component
- [x] Prisma DB sync and generate

### Pending ⏳
- [ ] ProductForm integration (category/color/images)
- [ ] Product creation API update (colorImages handling)
- [ ] Product edit API update (colorImages loading/saving)
- [ ] Full end-to-end testing
- [ ] Build and type check validation

### Next Steps
1. Integrate pickers into ProductForm
2. Update product APIs
3. Run full test suite
4. Validate build/type check
5. Report to user for approval

---

**Note:** All work is LOCAL ONLY. NO git commit, push, branch creation, or deployment until user approval.
