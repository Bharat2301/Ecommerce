'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWishlistStore } from '@/app/stores/wishlistStore';
import { useApi } from '@/hooks/useApi';
import { useCartActions } from '@/hooks/useCartActions';
import ProductCard from '../components/ProductCard';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import toast from 'react-hot-toast';
import { Heart } from 'lucide-react';
import api from '@/utils/api';

export default function Wishlist() {
  const { wishlist } = useWishlistStore();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { handleRequest } = useApi();
  const { handleAddToCart } = useCartActions();
  const router = useRouter();

  useEffect(() => {
    const fetchWishlistProducts = async () => {
      try {
        const response = await handleRequest(
          api.get('/api/products', { params: { ids: wishlist.join(',') } })
        );
        if (response.success) {
          setProducts(response.data.products || []);
        }
      } catch (error) {
        toast.error('Failed to load wishlist');
      } finally {
        setLoading(false);
      }
    };

    if (wishlist.length > 0) {
      fetchWishlistProducts();
    } else {
      setLoading(false);
    }
  }, [wishlist, handleRequest]);

  const setPage = (page, params) => {
    router.push(`/product/${params.productId}`);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 flex items-center">
        <Heart className="mr-2" /> Your Wishlist
      </h1>
      {loading ? (
        <Skeleton count={3} height={300} />
      ) : wishlist.length === 0 ? (
        <p>Your wishlist is empty.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              addToCart={handleAddToCart}
              setPage={setPage}
            />
          ))}
        </div>
      )}
    </div>
  );
}
