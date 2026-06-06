import Link from "next/link";

export default function NotFound() {
  return (
    <div className="text-center py-20">
      <p className="text-5xl font-bold text-gray-200 mb-4">404</p>
      <p className="text-gray-500 mb-6">Asset not found.</p>
      <Link href="/" className="btn-primary">
        Back to catalog
      </Link>
    </div>
  );
}
