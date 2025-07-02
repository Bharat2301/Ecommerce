"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ProductCard from "./components/ProductCard";
import CategorySidebar from "./components/CategorySidebar";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { useApi } from "@/hooks/useApi";
import api from "@/utils/api";
import { toast } from "react-hot-toast";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const { handleRequest } = useApi();
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch categories
        const categoryResponse = await handleRequest(api.get("/api/products/categories"));
        if (categoryResponse.success) {
          setCategories(categoryResponse.data);
        }

        // Fetch products
        const productResponse = await handleRequest(
          api.get("/api/products", {
            params: {
              category: selectedCategory,
              term: searchQuery,
              page: 1,
              limit: 12,
            },
          })
        );
        if (productResponse.success) {
          setProducts(productResponse.data.products || []);
        }
      } catch (error) {
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedCategory, searchQuery, handleRequest]);

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  return (
    <div className="container mx-auto p-4 flex flex-col md:flex-row gap-4">
      <CategorySidebar
        categories={categories}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
      />
      <div className="flex-1">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            aria-label="Search products"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {loading ? (
            Array(6)
              .fill(0)
              .map((_, i) => <Skeleton key={i} height={300} />)
          ) : products.length === 0 ? (
            <p>No products found.</p>
          ) : (
            products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                addToCart={() => {
                  throw new Error("Function not implemented.");
                }}
                setPage={() => {
                  throw new Error("Function not implemented.");
                }}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
