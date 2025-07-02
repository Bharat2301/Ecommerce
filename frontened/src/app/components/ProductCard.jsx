'use client';

import Image from 'next/image';

export default function ProductCard({ product, addToCart, setPage }) {
  const handleAddToCart = () => {
    const cartItem = {
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      size: product.sizes?.[0] || undefined,
      color: product.colors?.[0] || undefined,
      image: product.images?.[0] || 'https://via.placeholder.com/100',
    };
    addToCart(cartItem);
  };

  return (
    <div className="bg-white border rounded-lg shadow-md p-4">
      <Image
        src={product.images?.[0] || 'https://via.placeholder.com/100'}
        alt={product.name}
        width={200}
        height={200}
        className="w-full h-48 object-cover rounded"
      />
      <h3 className="text-lg font-semibold mt-2">{product.name}</h3>
      <p className="text-gray-600">₹{product.price.toFixed(2)}</p>
      <div className="flex gap-2 mt-2">
        <button
          onClick={handleAddToCart}
          className="bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded"
        >
          Add to Cart
        </button>
        <button
          onClick={() => setPage('product', { productId: product.id })}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          View Details
        </button>
      </div>
    </div>
  );
}