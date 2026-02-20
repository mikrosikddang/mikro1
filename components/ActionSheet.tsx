"use client";

import { useEffect, useRef } from "react";

type ActionSheetProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
};

export default function ActionSheet({ open, onClose, children, title }: ActionSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // ESC key to close
  useEffect(() => {
    if (!open) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[80] bg-black/40 transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 z-[90] bg-white rounded-t-2xl shadow-xl transition-transform duration-200 ease-out pb-[env(safe-area-inset-bottom)]"
        style={{
          transform: open ? "translateY(0)" : "translateY(100%)",
        }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Title */}
        {title && (
          <div className="px-4 pb-2">
            <h3 className="text-[15px] font-semibold text-gray-900">{title}</h3>
          </div>
        )}

        {/* Content */}
        <div className="px-2 pb-4">{children}</div>
      </div>
    </>
  );
}

type ActionSheetItemProps = {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
};

export function ActionSheetItem({
  label,
  icon,
  onClick,
  destructive = false,
  disabled = false,
}: ActionSheetItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full h-12 px-4 flex items-center justify-between rounded-lg transition-colors ${
        destructive
          ? "text-red-600 hover:bg-red-50 active:bg-red-100"
          : "text-gray-900 hover:bg-gray-50 active:bg-gray-100"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <span className="text-[16px] font-medium">{label}</span>
      {icon && <span className="ml-2">{icon}</span>}
    </button>
  );
}
