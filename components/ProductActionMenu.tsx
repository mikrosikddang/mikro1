"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/SessionProvider";
import { isAdmin, canAccessSellerFeatures } from "@/lib/roles";
import { toggleWishlist, isWishlisted } from "@/lib/wishlist";
import ActionSheet, { ActionSheetItem } from "@/components/ActionSheet";

type ProductActionMenuProps = {
  productId: string;
  sellerId: string;
  onClose: () => void;
};

export default function ProductActionMenu({
  productId,
  sellerId,
  onClose,
}: ProductActionMenuProps) {
  const router = useRouter();
  const session = useSession();
  const [processing, setProcessing] = useState(false);

  const isAdminUser = session ? isAdmin(session.role) : false;
  const isSellerUser = session ? canAccessSellerFeatures(session.role) : false;
  const isOwnProduct = session ? session.userId === sellerId : false;
  const wishlisted = isWishlisted(productId);

  // 즐겨찾기 토글
  const handleToggleWishlist = useCallback(() => {
    if (!session) {
      // 로그인 유도
      router.push(`/login?next=/`);
      onClose();
      return;
    }

    toggleWishlist(productId);
    onClose();
  }, [session, productId, router, onClose]);

  // 판매자: 상품 편집
  const handleEdit = useCallback(() => {
    router.push(`/seller/products/${productId}/edit`);
    onClose();
  }, [productId, router, onClose]);

  // 관리자: 게시물 숨기기
  const handleHide = useCallback(async () => {
    if (!confirm("이 게시물을 숨기시겠습니까?\n\n다른 사용자에게 표시되지 않습니다.")) {
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}/hide`, {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("게시물 숨기기에 실패했습니다");
      }

      alert("게시물이 숨겨졌습니다.");
      onClose();

      // 페이지 새로고침 (목록에서 제거)
      router.refresh();
    } catch (error: any) {
      console.warn("ADMIN HIDE ACTION:", error.message);
      alert(error.message || "오류가 발생했습니다");
    } finally {
      setProcessing(false);
    }
  }, [productId, router, onClose]);

  // 관리자: 게시물 삭제
  const handleDelete = useCallback(async () => {
    if (!confirm("⚠️ 이 게시물을 삭제하시겠습니까?\n\n삭제된 게시물은 복구할 수 없습니다.")) {
      return;
    }

    // 2차 확인
    if (!confirm("정말로 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.")) {
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("게시물 삭제에 실패했습니다");
      }

      alert("게시물이 삭제되었습니다.");
      onClose();

      // 페이지 새로고침 (목록에서 제거)
      router.refresh();
    } catch (error: any) {
      console.warn("ADMIN DELETE ACTION:", error.message);
      alert(error.message || "오류가 발생했습니다");
    } finally {
      setProcessing(false);
    }
  }, [productId, router, onClose]);

  return (
    <ActionSheet open={true} onClose={onClose}>
      {/* 공통: 즐겨찾기 */}
      <ActionSheetItem
        label={wishlisted ? "즐겨찾기 해제" : "즐겨찾기 추가"}
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        }
        onClick={handleToggleWishlist}
      />

      {/* 판매자: 내 상품 편집 */}
      {isSellerUser && isOwnProduct && (
        <ActionSheetItem
          label="상품 편집"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
              />
            </svg>
          }
          onClick={handleEdit}
          disabled={processing}
        />
      )}

      {/* 관리자: 숨기기 */}
      {isAdminUser && (
        <ActionSheetItem
          label="게시물 숨기기"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
              />
            </svg>
          }
          onClick={handleHide}
          disabled={processing}
        />
      )}

      {/* 관리자: 삭제 */}
      {isAdminUser && (
        <ActionSheetItem
          label="게시물 삭제"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
              />
            </svg>
          }
          onClick={handleDelete}
          destructive
          disabled={processing}
        />
      )}
    </ActionSheet>
  );
}
