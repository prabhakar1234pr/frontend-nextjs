export default function Loading() {
  return (
    <>
      <div className="min-h-screen bg-[#2f3338]">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="animate-pulse">
            {/* Top Navigation Bar Skeleton */}
            <div className="flex items-center justify-between mb-10">
              <div className="h-10 bg-[#3f4449] rounded-lg w-32"></div>
              <div className="flex items-center gap-3">
                <div className="h-9 bg-[#3f4449] rounded-lg w-32"></div>
                <div className="h-9 bg-[#3f4449] rounded-lg w-28"></div>
              </div>
            </div>
            
            {/* Title Skeleton */}
            <div className="h-7 bg-[#3f4449] rounded w-48 mb-6"></div>
            
            {/* Project Cards Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="aspect-[4/3] bg-[#3f4449] rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

