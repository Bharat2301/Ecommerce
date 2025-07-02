'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProductCard from '@/app/components/ProductCard';
import CategorySidebar from '@/app/components/CategorySidebar';
import { useApi } from '@/hooks/useApi';
import api from '@/utils/api';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import toast from 'react-hot-toast';

export default function CategoryPage() {
  const { categoryName } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { handleRequest } = useApi();
  const router = useRouter();

  useEffect(() => {
    const fetchCategoryProducts = async () => {
      if (!categoryName || typeof categoryName !== 'string') {
        toast.error('Invalid category');
        setLoading(false);
        return;
      }

      try {
        const res = await handleRequest(
          api.get('/api/products', { params: { category: categoryName } })
        );
        if (res.success) {
          setProducts(
            res.data.products.map((product) => ({
              ...product,
              seller: product.seller ?? '',
            }))
          );
        } else {
          throw new Error(res.error || 'Failed to fetch products');
        }
      } catch (error) {
        toast.error(error.message || 'Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryProducts();
  }, [categoryName, handleRequest]);

  const category =
    typeof categoryName === 'string'
      ? categoryName.charAt(0).toUpperCase() + categoryName.slice(1)
      : 'Category';

  return (
    <div className="flex w-full bg-white p-4 rounded shadow text-black">
      <CategorySidebar
        setSelectedCategory={(cat) => router.push(`/category/${cat.toLowerCase()}`)}
        selectedCategory={category}
      />
      <div className="flex-1 p-6">
        <h1 className="text-3xl font-bold mb-6">{category} Collection</h1>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array(4)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={i} height={300} width="100%" />
              ))}
          </div>
        ) : products.length === 0 ? (
          <p>No products available</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                addToCart={(item) => {
                  throw new Error('Function not implemented.');
                }}
                setPage={(page, params) => {
                  throw new Error('Function not implemented.');
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}