type ArchiveCaptionProps = {
  title: string;
  body?: string | null;
};

export default function ArchiveCaption({ title, body }: ArchiveCaptionProps) {
  const normalizedBody = body?.trim() ?? "";

  return (
    <section className="space-y-2">
      <h1 className="text-[15px] font-bold leading-snug text-black">
        {title}
      </h1>

      {normalizedBody && (
        <p
          className="whitespace-pre-wrap text-[14px] leading-relaxed text-gray-800"
        >
          {normalizedBody}
        </p>
      )}
    </section>
  );
}
