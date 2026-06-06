export default function Loading() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card p-5 animate-pulse">
          <div className="h-4 w-16 bg-gray-100 rounded mb-3" />
          <div className="h-5 w-3/4 bg-gray-100 rounded mb-2" />
          <div className="h-4 w-full bg-gray-100 rounded mb-1" />
          <div className="h-4 w-2/3 bg-gray-100 rounded" />
        </div>
      ))}
    </div>
  );
}
