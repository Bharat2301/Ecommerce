// components/SimilarProductCard.jsx
import Image from "next/image";

export default function SimilarProductCard({ product, onClick }) {
  const getOptimizedImage = (url) =>
    `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/f_auto,q_auto,w_200/${url}`;

  return (
    <div
      className="min-w-[200px] bg-white rounded-lg shadow-md cursor-pointer hover:shadow-lg transition"
      onClick={onClick}
      role="button"
      aria-label={`View ${product.name}`}
    >
      <Image
        src={getOptimizedImage(product.images?.[0] || "/images/placeholder.png")}
        alt={product.name}
        width={200}
        height={250}
        className="w-full h-[250px] object-cover rounded-t-lg"
        onError={(e) => (e.currentTarget.src = "/images/placeholder.png")}
      />
      <div className="p-4">
        <p className="text-gray-800 font-semibold">{product.name}</p>
        <div className="flex items-center mb-2">
          <span className="text-yellow-500 font-semibold">{product.rating || 4.5} ★</span>
        </div>
        <p className="text-gray-600 text-sm">{product.seller || "Clothing Store"}</p>
      </div>
    </div>
  );
}