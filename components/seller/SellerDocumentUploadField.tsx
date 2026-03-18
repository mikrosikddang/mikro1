"use client";

import Image from "next/image";
import { useRef } from "react";

interface SellerDocumentUploadFieldProps {
  label: string;
  value: string;
  disabled?: boolean;
  uploading?: boolean;
  helperText?: string;
  errorText?: string | null;
  onUpload: (file: File) => void | Promise<void>;
  onClear: () => void;
}

export default function SellerDocumentUploadField({
  label,
  value,
  disabled = false,
  uploading = false,
  helperText,
  errorText,
  onUpload,
  onClear,
}: SellerDocumentUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="mb-6">
      <label className="mb-2 block text-[14px] font-medium text-gray-700">
        {label}
      </label>
      {value ? (
        <div className="relative inline-block">
          <Image
            src={value}
            alt={label}
            width={200}
            height={280}
            className="rounded-xl border border-gray-200 object-cover"
          />
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black text-[12px] text-white disabled:opacity-50"
          >
            X
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="flex h-32 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 text-gray-400 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <span className="text-[13px]">업로드 중...</span>
          ) : (
            <>
              <span className="mb-1 text-[24px]">+</span>
              <span className="text-[13px]">{label} 업로드</span>
              <span className="mt-1 text-[11px]">JPG, PNG, WEBP (5MB 이하)</span>
            </>
          )}
        </button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void onUpload(file);
          }
          event.currentTarget.value = "";
        }}
        className="hidden"
      />
      {helperText ? <p className="mt-1 text-[12px] text-gray-500">{helperText}</p> : null}
      {errorText ? <p className="mt-1 text-[12px] text-red-500">{errorText}</p> : null}
    </div>
  );
}
