'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import CategorySidebar from './CategorySidebar';
import ProductCard from './ProductCard';
import { toast } from 'react-hot-toast';
import api from '@/utils/api';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

export default function HomeContent({ addToCart, setPage }) {
  const [selectedCategory, setSelectedCategory] = useState('Kids');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const categories = [
    {
      name: 'Men',
      image: 'https://res.cloudinary.com/dugh8szaj/image/upload/v1744894923/mens5_xcwoyb.avif',
    },
    {
      name: 'Women',
      image: 'https://res.cloudinary.com/dugh8szaj/image/upload/v1744895092/women1_gtbpj6.avif',
    },
    {
      name: 'Kids',
      image: 'https://res.cloudinary.com/dugh8szaj/image/upload/v1744894750/kids1_hjmt9l.avif',
    },
    {
      name: 'Bags',
      image: 'https://res.cloudinary.com/dugh8szaj/image/upload/v1744894446/bag2_qlri2j.avif',
    },
  ];

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await api.get('/api/products');
        if (res.data.success && Array.isArray(res.data.data)) {
          setProducts(res.data.data);
        } else {
          throw new Error(res.data.error || 'Invalid product data');
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        toast.error(error.message || 'Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const handleAddToCart = useCallback(
    (product) => {
      try {
        const cartItem = {
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          size: product.sizes?.[0] || undefined,
          image: product.images?.[0] || 'https://via.placeholder.com/100',
        };
        addToCart(cartItem);
        toast.success(`${product.name} added to cart!`);
      } catch (error) {
        console.error('Failed to add to cart:', error);
        toast.error('Failed to add to cart');
      }
    },
    [addToCart]
  );

  const handleCategoryClick = useCallback(
    (categoryName) => {
      router.push(`/category/${categoryName.toLowerCase()}`);
    },
    [router]
  );

  const getCategoryProducts = useCallback(
    (categoryName) => {
      return products
        .filter((product) => product.category === categoryName)
        .slice(0, 4);
    },
    [products]
  );

  const bestSellers = products
    .sort((a, b) => b.price - a.price)
    .slice(0, 4);

  const filteredProducts = products
    .filter((product) => product.category === selectedCategory)
    .slice(0, 4);

  if (loading) {
    return (
      <div className="bg-white">
        <div className="flex w-full">
          <CategorySidebar
            setSelectedCategory={setSelectedCategory}
            selectedCategory={selectedCategory}
          />
          <div className="flex-1 py-8 px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {Array(4)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} height={300} />
                ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return <div className="text-center p-6">No products available.</div>;
  }

  return (
    <div className="bg-white">
      <div className="flex w-full">
        <CategorySidebar
          setSelectedCategory={setSelectedCategory}
          selectedCategory={selectedCategory}
        />
        <div className="flex-1">
          <div className="py-8 px-6">
            <h2 className="text-2xl font-bold text-center mb-6">Featured Categories</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {categories.map((category) => (
                <div
                  key={category.name}
                  className="bg-gray-100 rounded-lg overflow-hidden shadow-md cursor-pointer hover:shadow-lg transition"
                  onClick={() => handleCategoryClick(category.name)}
                >
                  <Image
                    src={category.image}
                    alt={category.name}
                    className="w-full h-48 object-cover"
                    loading="eager"
                    width={500}
                    height={500}
                  />
                  <div className="p-4 text-center">
                    <h3 className="text-lg font-semibold">{category.name}</h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="py-8 px-6">
            <h2 className="text-2xl font-bold text-center mb-6">Best Sellers</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {bestSellers.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  addToCart={addToCart}
                  setPage={setPage}
                />
              ))}
            </div>
          </div>
          <div className="py-8 px-6">
            <h2 className="text-2xl font-bold text-center mb-6">{selectedCategory} Collection</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  addToCart={addToCart}
                  setPage={setPage}
                />
              ))}
            </div>
          </div>
          {categories
            .filter((category) => category.name !== selectedCategory)
            .map((category) => (
              <div key={category.name} className="py-8 px-6">
                <h2 className="text-2xl font-bold text-center mb-6">{category.name} Collection</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                  {getCategoryProducts(category.name).map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      addToCart={addToCart}
                      setPage={setPage}
                    />
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}