/**
 * Department/custom section loading skeleton.
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-gray-100 animate-pulse shrink-0" />
            <div className="flex-1">
              <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-1" />
              <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="w-10 h-10 rounded-[14px] bg-gray-100 animate-pulse" />
          </div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-4">
        {/* Search bar */}
        <div className="h-11 bg-gray-100 rounded-[14px] animate-pulse mb-4" />

        {/* Product list */}
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between py-3 border-b border-gray-50 animate-pulse"
          >
            <div className="flex-1 pr-4">
              <div className="h-5 w-40 bg-gray-100 rounded mb-1" />
              <div className="h-3 w-20 bg-gray-50 rounded" />
            </div>
            <div className="w-8 h-8 rounded-lg bg-gray-100" />
          </div>
        ))}

        <div className="flex justify-center mt-6">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-brand-500 rounded-full animate-spin" />
        </div>
      </main>
    </div>
  );
}
