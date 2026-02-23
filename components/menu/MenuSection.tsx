type MenuSectionProps = {
  title: string;
  children: React.ReactNode;
};

export default function MenuSection({ title, children }: MenuSectionProps) {
  return (
    <div className="mt-4 first:mt-3">
      <h3 className="text-[12px] tracking-[0.12em] text-gray-400 font-medium mb-1 px-4">
        {title}
      </h3>
      <div>{children}</div>
    </div>
  );
}
