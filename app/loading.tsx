import Container from "@/components/Container";

export default function Loading() {
  return (
    <Container>
      {/* Category chips skeleton */}
      <div className="py-3 flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-8 w-16 bg-gray-200 rounded-full animate-pulse"
          />
        ))}
      </div>

      {/* Feed cards skeleton */}
      {[1, 2].map((i) => (
        <div key={i} className="mb-4">
          {/* Header row */}
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="w-7 h-7 bg-gray-200 rounded-full animate-pulse" />
            <div className="h-3.5 w-20 bg-gray-200 rounded animate-pulse" />
          </div>
          {/* Image */}
          <div
            className="w-full bg-gray-200 animate-pulse"
            style={{ aspectRatio: "4/5" }}
          />
          {/* Text */}
          <div className="px-4 py-3 space-y-2">
            <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-1/3 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </Container>
  );
}
