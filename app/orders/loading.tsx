/**
 * Orders page loading skeleton.
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="relative flex items-center justify-center mb-4">
            <div className="absolute left-0 w-10 h-10 rounded-[14px] bg-gray-100 animate-pulse" />
            <div className="h-7 w-20 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex-1 h-9 bg-gray-200 rounded-md animate-pulse" />
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto">
        {/* List skeleton */}
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="px-4 py-4 border-b border-gray-50 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-5 w-48 bg-gray-100 rounded mb-2" />
                <div className="h-3 w-24 bg-gray-50 rounded" />
              </div>
              <div className="h-10 w-24 bg-gray-100 rounded-xl" />
            </div>
          </div>
        ))}

        <div className="flex justify-center mt-8">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-brand-500 rounded-full animate-spin" />
        </div>
      </main>
    </div>
  );
}
