import Container from "@/components/Container";

export default function Loading() {
  return (
    <Container>
      {/* Image skeleton */}
      <div
        className="w-full bg-gray-200 animate-pulse"
        style={{ aspectRatio: "3/4" }}
      />

      <div className="py-4 space-y-4">
        {/* Seller row */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
          <div className="h-3.5 w-24 bg-gray-200 rounded animate-pulse" />
        </div>

        {/* Title + price */}
        <div className="flex items-baseline justify-between gap-4">
          <div className="h-5 w-2/3 bg-gray-200 rounded animate-pulse" />
          <div className="h-5 w-20 bg-gray-200 rounded animate-pulse" />
        </div>

        <div className="border-t border-gray-100 my-4" />

        {/* Option area */}
        <div className="space-y-3">
          <div className="h-3.5 w-12 bg-gray-200 rounded animate-pulse" />
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-8 h-8 bg-gray-200 rounded-md animate-pulse"
              />
            ))}
          </div>
          <div className="h-3.5 w-12 bg-gray-200 rounded animate-pulse" />
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-10 w-14 bg-gray-200 rounded-lg animate-pulse"
              />
            ))}
          </div>
        </div>

        {/* CTA button */}
        <div className="h-[52px] bg-gray-200 rounded-lg animate-pulse" />
      </div>
    </Container>
  );
}
