"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import ProductCard from "./ProductCard";
import CategorySidebar from "./CategorySidebar";
import { useCartActions } from "@/hooks/useCartActions";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

export default function BagsPage({ setPage }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { handleAddToCart } = useCartActions();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/products`);
        const bagsProducts = res.data.data.filter(
          (product) => product.category === "Bags"
        );
        setProducts(bagsProducts);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  return (
    <div className="flex w-full bg-white p-4 rounded shadow text-black">
      <CategorySidebar
        setSelectedCategory={(category) => setPage(category.toLowerCase())}
        selectedCategory={""}
      />
      <div className="flex-1 p-6 text-black">
        <h1 className="text-3xl font-bold mb-6">Bags Collection</h1>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array(4)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={i} height={200} />
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
                setPage={setPage}
                addToCart={function (item) {
                  throw new Error("Function not implemented.");
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}