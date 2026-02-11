export default function Container({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[420px] px-4">
      {children}
    </div>
  );
}
