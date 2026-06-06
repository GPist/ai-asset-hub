export default function AssetDetailLoading() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px] animate-pulse">
      <div>
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-1 space-y-2">
            <div className="h-5 w-14 bg-gray-100 rounded-full" />
            <div className="h-7 w-1/2 bg-gray-100 rounded" />
            <div className="h-4 w-2/3 bg-gray-100 rounded" />
          </div>
        </div>
        <div className="flex gap-2 mb-6">
          <div className="h-9 w-36 bg-gray-100 rounded-lg" />
          <div className="h-9 w-28 bg-gray-100 rounded-lg" />
          <div className="h-9 w-36 bg-gray-100 rounded-lg" />
        </div>
        <div className="card p-6 space-y-3">
          <div className="h-5 w-1/3 bg-gray-100 rounded" />
          <div className="h-4 w-full bg-gray-100 rounded" />
          <div className="h-4 w-5/6 bg-gray-100 rounded" />
          <div className="h-4 w-4/6 bg-gray-100 rounded" />
          <div className="h-4 w-full bg-gray-100 rounded" />
          <div className="h-4 w-3/4 bg-gray-100 rounded" />
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <div className="card p-4 space-y-3">
          <div className="h-4 w-12 bg-gray-100 rounded" />
          <div className="flex gap-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-7 w-20 bg-gray-100 rounded" />
            ))}
          </div>
          <div className="h-16 bg-gray-50 rounded border border-gray-100" />
        </div>
        <div className="card p-4 space-y-2">
          <div className="h-4 w-24 bg-gray-100 rounded" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-gray-50 rounded border border-gray-100" />
          ))}
        </div>
      </div>
    </div>
  );
}
