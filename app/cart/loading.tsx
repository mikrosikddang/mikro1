import Container from "@/components/Container";

export default function Loading() {
  return (
    <Container>
      <div className="py-6">
        {/* Header */}
        <div className="h-7 w-24 bg-gray-200 rounded animate-pulse mb-6" />

        {/* Cart items */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex gap-4 p-4 bg-white rounded-xl border border-gray-100"
            >
              {/* Image */}
              <div className="flex-shrink-0 w-20 h-20 bg-gray-200 rounded-lg animate-pulse" />
              {/* Info */}
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                <div className="h-3.5 w-1/3 bg-gray-200 rounded animate-pulse" />
                <div className="h-3.5 w-1/4 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-1/3 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="mt-6 p-4 bg-gray-50 rounded-xl">
          <div className="flex justify-between items-center">
            <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
            <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>

        {/* CTA button */}
        <div className="mt-6 h-[56px] bg-gray-200 rounded-xl animate-pulse" />
      </div>
    </Container>
  );
}
