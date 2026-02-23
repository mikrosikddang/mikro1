type MenuSectionProps = {
  title: string;
  children: React.ReactNode;
};

export default function MenuSection({ title, children }: MenuSectionProps) {
  return (
    <div className="mt-6 first:mt-4">
      <h3 className="text-[12px] tracking-widest text-gray-400 font-semibold mb-2 px-4">
        {title}
      </h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
