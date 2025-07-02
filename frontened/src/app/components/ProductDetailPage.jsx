'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import api, { getReviews, submitReview } from '@/utils/api';
import SimilarProductCard from './SimilarProductCard';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

export default function ProductDetail({ productId }) {
  const router = useRouter();
  const [product, setProduct] = useState(null);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [loading, setLoading] = useState(true);
  const [similarLoading, setSimilarLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isSizeChartOpen, setIsSizeChartOpen] = useState(false);
  const { addToCart, cart } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const zoomRef = useRef(null);

  const getOptimizedImage = (url) =>
    `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/f_auto,q_auto,w_400/${url}`;

  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId) {
        toast.error('Invalid product ID');
        router.push('/');
        return;
      }
      try {
        const res = await api.get(`/products/${productId}`);
        if (res.data.success && res.data.data) {
          const productData = {
            ...res.data.data,
            sizeChart: res.data.data.sizeChart || {},
          };
          setProduct(productData);
          setSelectedImage(productData.images?.[0] || '/images/placeholder.png');
          setSelectedColor(productData.colors?.[0] || '');
        } else {
          throw new Error(res.data.error || 'Product not found');
        }

        if (res.data.data?.category) {
          const similarRes = await api.get('/products', {
            params: { category: res.data.data.category, term: '' },
          });
          if (similarRes.data.success) {
            setSimilarProducts(
              similarRes.data.data.filter((p) => p.id !== productId).slice(0, 5)
            );
          }
        }

        const reviewRes = await getReviews(productId);
        setReviews((reviewRes && reviewRes.success && Array.isArray(reviewRes.data)) ? reviewRes.data : []);
      } catch (error) {
        toast.error(error.message || 'Failed to load product');
      } finally {
        setLoading(false);
        setSimilarLoading(false);
      }
    };
    fetchProduct();
  }, [productId, router]);

  const handleAddToCart = () => {
    if (!product) {
      toast.error('Product not available');
      return;
    }
    if (!selectedSize && product.sizes?.length) {
      toast.error('Please select a size');
      return;
    }
    if (!selectedColor && product.colors?.length) {
      toast.error('Please select a color');
      return;
    }
    if (quantity < 1 || (product.stockBySize && product.stockBySize[selectedSize] < quantity)) {
      toast.error('Selected quantity not available');
      return;
    }
    const cartItem = {
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity,
      size: selectedSize || undefined,
      color: selectedColor || undefined,
      image: product.images?.[0] || '/images/placeholder.png',
    };
    addToCart(cartItem);
    toast.success(`${product.name} added to cart!`);
  };

  if (loading) {
    return (
      <div className="p-6">
        <Skeleton height={500} />
      </div>
    );
  }

  if (!product) {
    return <p className="text-center py-10">Product not found</p>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Product Images */}
        <div className="space-y-4">
          <div className="border rounded-lg overflow-hidden">
            <Image
              src={getOptimizedImage(selectedImage)}
              alt={product.name}
              width={500}
              height={500}
              className="w-full h-auto object-contain"
            />
          </div>
          <div className="flex space-x-2 overflow-x-auto">
            {product.images?.map((img, index) => (
              <button
                key={index}
                onClick={() => setSelectedImage(img)}
                className={`border rounded-md p-1 ${selectedImage === img ? 'ring-2 ring-blue-500' : ''}`}
              >
                <Image
                  src={getOptimizedImage(img)}
                  alt={`${product.name} thumbnail ${index + 1}`}
                  width={80}
                  height={80}
                  className="w-16 h-16 object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div>
          <h1 className="text-2xl font-bold">{product.name}</h1>
          <p className="text-gray-600 mt-2">{product.description}</p>
          <div className="mt-4">
            <span className="text-3xl font-bold">₹{product.price.toFixed(2)}</span>
            {product.mrp && (
              <span className="ml-2 text-lg text-gray-500 line-through">₹{product.mrp.toFixed(2)}</span>
            )}
          </div>

          {/* Size Selection */}
          {product.sizes?.length > 0 && (
            <div className="mt-6">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Size</h3>
                <button
                  onClick={() => setIsSizeChartOpen(true)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Size Guide
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`px-4 py-2 border rounded-md ${selectedSize === size ? 'bg-black text-white border-black' : 'hover:border-gray-400'}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Color Selection */}
          {product.colors?.length > 0 && (
            <div className="mt-6">
              <h3 className="font-medium">Color</h3>
              <div className="flex flex-wrap gap-2 mt-2">
                {product.colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-8 h-8 rounded-full border ${selectedColor === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Quantity Selector */}
          <div className="mt-6">
            <h3 className="font-medium">Quantity</h3>
            <div className="flex items-center mt-2">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-3 py-1 border rounded-l-md hover:bg-gray-100"
              >
                -
              </button>
              <span className="px-4 py-1 border-t border-b">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="px-3 py-1 border rounded-r-md hover:bg-gray-100"
              >
                +
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 space-y-3">
            <button
              onClick={handleAddToCart}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-black py-3 rounded-md font-medium"
            >
              Add to Cart
            </button>
            <button
              onClick={() => {
                handleAddToCart();
                router.push('/checkout');
              }}
              className="w-full bg-black hover:bg-gray-800 text-white py-3 rounded-md font-medium"
            >
              Buy Now
            </button>
          </div>
        </div>
      </div>

      {/* Similar Products */}
      <div className="mt-16">
        <h2 className="text-xl font-bold mb-6">Similar Products</h2>
        {similarLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array(5).fill().map((_, i) => (
              <Skeleton key={i} height={300} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {similarProducts.map((product) => (
              <SimilarProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}