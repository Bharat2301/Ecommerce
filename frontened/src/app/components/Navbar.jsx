'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { useRouter } from 'next/navigation';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import { getCategories, fetchProducts } from '@/utils/api';
import { toast } from 'react-hot-toast';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

export default function Navbar({ cartCount, initialCategories = [] }) {
  const { cart } = useCartStore();
  const { user, isAuthenticated, logout, initialize } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [categories, setCategories] = useState(initialCategories);
  const [filters, setFilters] = useState({ priceMin: '', priceMax: '', size: '', rating: '' });
  const [categoryError, setCategoryError] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const router = useRouter();
  const dropdownRef = useRef(null);
  const searchResultsRef = useRef(null);
  const isAdmin = user?.role === 'ADMIN';
  const userName = user?.name || user?.email?.split('@')[0] || 'User';
  const effectiveCartCount = cartCount !== undefined ? cartCount : cart.reduce((sum, item) => sum + item.quantity, 0);

  const fallbackCategories = ['Kids', 'Men', 'Women', 'Bags'];

  const fetchWithRetry = useCallback(
    async (signal, retries = 3, delay = 1000) => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const res = await getCategories({ signal });
          if (Array.isArray(res.data)) {
            return res.data;
          } else {
            throw new Error(typeof res.data === 'object' && res.data && 'error' in res.data ? res.data.error : 'Failed to fetch categories');
          }
        } catch (error) {
          if (error.name === 'AbortError') throw error;
          if (attempt === retries) throw error;
          console.warn(`[Navbar] Retry attempt ${attempt}/${retries} failed:`, error.message);
          await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, attempt)));
        }
      }
      throw new Error('Max retries reached');
    },
    []
  );

  const fetchCategories = useCallback(
    async (signal) => {
      if (initialCategories.length || categories.length) return;
      try {
        const fetchedCategories = await fetchWithRetry(signal);
        setCategories(fetchedCategories);
        localStorage.setItem('categories', JSON.stringify(fetchedCategories));
        setCategoryError(false);
      } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('[Navbar] Failed to fetch categories:', error.message);
        const cached = localStorage.getItem('categories');
        if (cached) {
          const parsed = JSON.parse(cached);
          setCategories(parsed);
        } else {
          setCategories(fallbackCategories);
          toast.error('Failed to load categories. Using default categories.');
        }
        setCategoryError(true);
      }
    },
    [initialCategories, categories.length, fetchWithRetry]
  );

  useEffect(() => {
    const controller = new AbortController();
    initialize();
    fetchCategories(controller.signal);
    return () => controller.abort();
  }, [fetchCategories, initialize]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setSearchResults([]);
        setSearchTerm('');
        setFocusedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const fetchSearchResults = async () => {
      if (!searchTerm.trim()) {
        setSearchResults([]);
        setSearchLoading(false);
        return;
      }
      setSearchLoading(true);
      try {
        const params = {
          term: searchTerm,
          priceMin: filters.priceMin || undefined,
          priceMax: filters.priceMax || undefined,
          size: filters.size || undefined,
          rating: filters.rating || undefined,
        };
        const res = await fetchProducts({ category: searchTerm }, { signal: controller.signal });
        if (Array.isArray(res.data)) {
          setSearchResults(res.data.map((product) => ({ ...product, seller: product.seller ?? '' })));
        } else {
          throw new Error(typeof res.data === 'object' && res.data && 'error' in res.data ? res.data.error : 'Search failed');
        }
      } catch (error) {
        if (error.name === 'AbortError') return;
        toast.error(error.message || 'Failed to search products');
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    };
    const delayDebounce = setTimeout(fetchSearchResults, 300);
    return () => {
      controller.abort();
      clearTimeout(delayDebounce);
    };
  }, [searchTerm, filters]);

  const handleLogout = () => {
    logout();
    router.push('/');
    toast.success('Logged out successfully');
  };

  const handleCategoryClick = (category) => {
    if (category) {
      setSearchResults([]);
      setSearchTerm('');
      router.push(`/category/${category.toLowerCase()}`);
    }
  };

  const handleCartClick = () => {
    setSearchResults([]);
    setSearchTerm('');
    router.push('/cart');
  };

  const handleSearchResultClick = (product) => {
    setSearchTerm('');
    setSearchResults([]);
    setFocusedIndex(-1);
    window.gtag?.('event', 'select_product', { product_id: product.id, product_name: product.name });
    router.push(`/product/${product.id}`);
  };

  const handleKeyDown = (e) => {
    if (!searchResults.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && focusedIndex >= 0) {
      handleSearchResultClick(searchResults[focusedIndex]);
    } else if (e.key === 'Escape') {
      setSearchResults([]);
      setSearchTerm('');
      setFocusedIndex(-1);
    }
  };

  const getOptimizedImage = (url) => {
    const cloudinaryBase = `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/f_auto,q_auto,w_100`;
    return url ? `${cloudinaryBase}/${url}` : `${cloudinaryBase}/v1/default-placeholder`;
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: categories.map((cat, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: cat,
              item: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://your-site.com'}/category/${cat.toLowerCase()}`,
            })),
          }),
        }}
      />
      <div className="bg-gray-200 text-sm p-2 text-center text-black">
        Welcome to Clothing Store Online Shopping{' '}
        {!isAuthenticated ? (
          <>
            <button
              onClick={() => router.push('/login')}
              className="text-blue-600 hover:underline"
              aria-label="Login"
            >
              Login
            </button>{' '}
            |{' '}
            <button
              onClick={() => router.push('/signup')}
              className="text-blue-600 hover:underline"
              aria-label="Sign Up"
            >
              Sign Up
            </button>{' '}
            |{' '}
            <button
              onClick={() => router.push('/admin-login')}
              className="text-blue-600 hover:underline"
              aria-label="Admin Login"
            >
              Admin Login
            </button>
          </>
        ) : (
          <span className="text-blue-600">
            Welcome, {userName} |{' '}
            <button onClick={handleLogout} className="hover:underline" aria-label="Logout">
              Logout
            </button>
          </span>
        )}
      </div>

      <nav className="bg-white p-4 flex justify-between items-center border-b text-black">
        <div className="flex items-center">
          <img
            src={getOptimizedImage('/images/logo.png')}
            alt="Clothing Store Logo"
            className="mr-2 w-10 h-10 object-contain"
            onError={(e) => (e.currentTarget.src = getOptimizedImage('/images/placeholder.png'))}
          />
          <h1 className="text-xl font-bold text-blue-600">Clothing Store</h1>
        </div>

        <ul className="flex space-x-6 items-center">
          <li>
            <button
              onClick={() => router.push('/')}
              className="hover:text-blue-600"
              aria-label="Home"
            >
              Home
            </button>
          </li>
          {categories.length > 0 ? (
            categories.map((cat) => (
              <li key={cat}>
                <button
                  onClick={() => handleCategoryClick(cat)}
                  className={`hover:text-blue-600 ${categoryError ? 'text-gray-500' : ''}`}
                  aria-label={`View ${cat} category`}
                  disabled={categoryError}
                >
                  {cat}
                </button>
              </li>
            ))
          ) : (
            <li>
              <Skeleton width={150} height={20} count={4} inline={true} />
            </li>
          )}
          {isAdmin && (
            <li>
              <button
                onClick={() => router.push('/admin')}
                className="hover:text-blue-600"
                aria-label="Admin Dashboard"
              >
                Dashboard
              </button>
            </li>
          )}
        </ul>

        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <span className="text-blue-600">Welcome, {userName}</span>
          ) : (
            <a href="tel:0123456789" className="text-blue-600 hover:underline">
              Free Call Us: 0123 456 789
            </a>
          )}
          <button
            onClick={handleCartClick}
            className="relative"
            title="View Cart"
            aria-label={`View cart with ${effectiveCartCount} items`}
          >
            <i className="fas fa-shopping-cart text-blue-600"></i>
            {effectiveCartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                {effectiveCartCount}
              </span>
            )}
          </button>
        </div>
      </nav>

      <div className="bg-blue-600 text-white p-3 relative flex flex-col items-center">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <label htmlFor="category-select" className="mr-3 font-semibold">
              CATEGORIES
            </label>
            <select
              id="category-select"
              className="bg-white text-black p-2 rounded"
              onChange={(e) => handleCategoryClick(e.target.value)}
              aria-label="Select Category"
              disabled={categoryError}
            >
              <option value="">Select Category</option>
              {categories.map((category) => (
                <option key={category} value={category.toLowerCase()}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 ml-6 relative">
            <input
              type="text"
              placeholder="Search by name, size, color, price, or category"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full p-2 text-black rounded-l-md border-none focus:outline-none focus:ring-2 focus:ring-blue-600"
              aria-label="Search products"
            />
            <button className="bg-blue-800 text-white p-2 rounded-r-md" aria-label="Search">
              <i className="fas fa-search"></i>
            </button>
          </div>
        </div>

        <div className="container mx-auto flex gap-3 mt-3">
          <input
            type="number"
            placeholder="Min Price"
            value={filters.priceMin}
            onChange={(e) => setFilters({ ...filters, priceMin: e.target.value })}
            className="p-2 rounded w-24 text-black"
            aria-label="Minimum price filter"
          />
          <input
            type="number"
            placeholder="Max Price"
            value={filters.priceMax}
            onChange={(e) => setFilters({ ...filters, priceMax: e.target.value })}
            className="p-2 rounded w-24 text-black"
            aria-label="Maximum price filter"
          />
          <input
            type="text"
            placeholder="Size (e.g., S)"
            value={filters.size}
            onChange={(e) => setFilters({ ...filters, size: e.target.value })}
            className="p-2 rounded w-24 text-black"
            aria-label="Size filter"
          />
          <select
            value={filters.rating}
            onChange={(e) => setFilters({ ...filters, rating: e.target.value })}
            className="p-2 rounded text-black"
            aria-label="Rating filter"
          >
            <option value="">Select Rating</option>
            <option value="4">4★ & Above</option>
            <option value="3">3★ & Above</option>
            <option value="2">2★ & Above</option>
          </select>
        </div>

        {searchResults.length > 0 && (
          <ul
            ref={searchResultsRef}
            className="absolute top-full mt-2 w-full max-w-2xl bg-white text-black rounded-lg shadow-lg z-50 left-1/2 transform -translate-x-1/2 max-h-80 overflow-y-auto"
            role="listbox"
          >
            {searchResults.map((product, index) => (
              <li
                key={product.id}
                className={`flex items-center p-3 border-b hover:bg-gray-100 cursor-pointer transition-colors duration-200 ${index === focusedIndex ? 'bg-gray-100' : ''}`}
                onClick={() => handleSearchResultClick(product)}
                role="option"
                aria-selected={index === focusedIndex}
                tabIndex={0}
              >
                <img
                  src={getOptimizedImage(product.images?.[0] || '/images/placeholder.png')}
                  alt={`Image of ${product.name}`}
                  className="w-12 h-12 object-cover rounded-full mr-4"
                  onError={(e) => (e.currentTarget.src = getOptimizedImage('/images/placeholder.png'))}
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{product.name}</p>
                  <p className="text-sm text-gray-600">
                    Category: {product.category} | Price: ₹{product.price?.toFixed(2) || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Size: {product.sizes?.join(', ') || 'N/A'} | Color: {product.colors?.join(', ') || 'N/A'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
        {searchLoading && (
          <div
            ref={dropdownRef}
            className="absolute top-full mt-2 w-full max-w-2xl bg-white text-black rounded-lg shadow-lg z-50 left-1/2 transform -translate-x-1/2 p-3"
          >
            <Skeleton count={3} height={60} />
          </div>
        )}
        {searchTerm.trim() && !searchLoading && !searchResults.length && (
          <div
            ref={dropdownRef}
            className="absolute top-full mt-2 w-full max-w-2xl bg-white text-black rounded-lg shadow-lg z-50 left-1/2 transform -translate-x-1/2 p-3"
          >
            <p className="text-center">No results found.</p>
          </div>
        )}
      </div>
    </div>
  );
}