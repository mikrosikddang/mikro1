import Container from "@/components/Container";

export default function Loading() {
  return (
    <Container>
      <div className="py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-28 bg-gray-200 rounded animate-pulse" />
          <div className="h-9 w-24 bg-gray-200 rounded-lg animate-pulse" />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-8 w-16 bg-gray-200 rounded-full animate-pulse"
            />
          ))}
        </div>

        {/* Product grid */}
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div
                className="bg-gray-200 rounded-lg animate-pulse"
                style={{ aspectRatio: "3/4" }}
              />
              <div className="mt-2 space-y-1.5">
                <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
                <div className="flex gap-1.5 mt-1">
                  {[1, 2, 3].map((j) => (
                    <div
                      key={j}
                      className="h-7 w-10 bg-gray-200 rounded animate-pulse"
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}
