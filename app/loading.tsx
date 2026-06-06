/**
 * Root-level loading skeleton — shown during initial page transitions.
 * Renders instantly while the page data is being fetched.
 */
export default function Loading() {
  return (
    <div className="min-h-screen" style={{ background: '#faf9f7' }}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header skeleton */}
        <div className="text-center mb-8">
          <div className="h-9 w-48 bg-gray-200 rounded-lg mx-auto mb-2 animate-pulse" />
          <div className="h-4 w-40 bg-gray-100 rounded mx-auto animate-pulse" />
        </div>

        {/* Status card skeleton */}
        <div className="bg-white rounded-[14px] p-5 mb-3 animate-pulse">
          <div className="h-5 w-32 bg-gray-100 rounded mb-3" />
          <div className="flex gap-3">
            <div className="flex-1 h-16 bg-gray-50 rounded-xl" />
            <div className="flex-1 h-16 bg-gray-50 rounded-xl" />
            <div className="flex-1 h-16 bg-gray-50 rounded-xl" />
          </div>
        </div>

        {/* Section cards skeleton */}
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-[14px] mb-2 overflow-hidden animate-pulse"
          >
            <div className="flex items-center px-4 py-3.5">
              <div className="w-8 h-8 bg-gray-100 rounded-lg mr-3" />
              <div className="flex-1">
                <div className="h-5 w-32 bg-gray-100 rounded mb-1" />
                <div className="h-3 w-24 bg-gray-50 rounded" />
              </div>
            </div>
          </div>
        ))}

        {/* Spinner */}
        <div className="flex justify-center mt-6">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-brand-500 rounded-full animate-spin" />
        </div>
      </div>
    </div>
  );
}
