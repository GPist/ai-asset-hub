export default function ReviewLoading() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="card p-5 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 bg-gray-100 rounded" />
              <div className="h-5 w-2/3 bg-gray-100 rounded" />
              <div className="h-4 w-1/3 bg-gray-100 rounded" />
            </div>
            <div className="h-8 w-28 bg-gray-100 rounded-lg" />
          </div>
          <div className="mt-4 flex gap-2">
            <div className="h-8 w-32 bg-gray-100 rounded-lg" />
            <div className="h-8 w-32 bg-gray-100 rounded-lg" />
            <div className="h-8 w-20 bg-gray-100 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
