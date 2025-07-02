"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { toast } from "react-hot-toast";
import { useCartStore } from "../../stores/cartStore";
import { useAuthStore } from "../../stores/authStore";
import api, { getReviews, submitReview } from "@/utils/api";
import SimilarProductCard from "../../components/SimilarProductCard";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

export default function ProductPage() {
  const { id: productId } = useParams();
  const router = useRouter();
  const [product, setProduct] = useState(null);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: "" });
  const [loading, setLoading] = useState(true);
  const [similarLoading, setSimilarLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const zoomRef = useRef(null);
  const [isSizeChartOpen, setIsSizeChartOpen] = useState(false);
  const { addToCart, cart } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const abortControllerRef = useRef(null);

  const getOptimizedImage = (url) =>
    `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/f_auto,q_auto,w_400/${url}`;

  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId || typeof productId !== "string") {
        toast.error("Invalid product ID");
        router.push("/");
        return;
      }

      try {
        abortControllerRef.current = new AbortController();
        const res = await api.get(`/api/products/${productId}`, {
          signal: abortControllerRef.current.signal,
        });

        if (res.data.success && res.data.data) {
          const productData = {
            ...res.data.data,
            sizeChart: res.data.data.sizeChart || {},
            images: res.data.data.images || ["/images/placeholder.png"],
            sizes: res.data.data.sizes || [],
            colors: res.data.data.colors || [],
          };
          setProduct(productData);
          setSelectedImage(productData.images[0]);
          setSelectedColor(productData.colors[0] || "");
        } else {
          throw new Error(res.data.error || "Product not found");
        }

        if (res.data.data?.category) {
          try {
            const similarRes = await api.get("/api/products", {
              params: { category: res.data.data.category, term: "" },
              signal: abortControllerRef.current.signal,
            });
            if (similarRes.data.success) {
              setSimilarProducts(
                similarRes.data.data.filter((p) => p.id !== productId).slice(0, 5)
              );
            }
          } catch (error) {
            toast.error("Failed to load similar products");
          } finally {
            setSimilarLoading(false);
          }
        }

        try {
          const reviewRes = await getReviews(productId, {
            signal: abortControllerRef.current.signal,
          });
          if (Array.isArray(reviewRes)) {
            setReviews(reviewRes);
          }
        } catch (error) {
          console.error("Failed to load reviews:", error);
        }
      } catch (error) {
        toast.error(error.message || "Failed to load product");
        router.push("/");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [productId, router]);

  const handleImageClick = (img) => {
    setSelectedImage(img);
  };

  const handleAddToCart = () => {
    if (!product) {
      toast.error("Product not available");
      return;
    }
    if (!selectedSize && product.sizes?.length) {
      toast.error("Please select a size");
      return;
    }
    if (!selectedColor && product.colors?.length) {
      toast.error("Please select a color");
      return;
    }
    if (
      quantity < 1 ||
      (product.stockBySize && product.stockBySize[selectedSize] < quantity)
    ) {
      toast.error("Selected quantity not available");
      return;
    }
    try {
      const cartItem = {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity,
        size: selectedSize || undefined,
        color: selectedColor || undefined,
        image: product.images[0] || "/images/placeholder.png",
      };
      addToCart(cartItem);
      toast.success(`${product.name} added to cart!`);
    } catch (error) {
      toast.error("Failed to add to cart");
    }
  };

  const handleBuyNow = () => {
    if (!product) {
      toast.error("Product not available");
      return;
    }
    if (!selectedSize && product.sizes?.length) {
      toast.error("Please select a size");
      return;
    }
    if (!selectedColor && product.colors?.length) {
      toast.error("Please select a color");
      return;
    }
    if (
      quantity < 1 ||
      (product.stockBySize && product.stockBySize[selectedSize] < quantity)
    ) {
      toast.error("Selected quantity not available");
      return;
    }
    try {
      const cartItem = {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity,
        size: selectedSize || undefined,
        color: selectedColor || undefined,
        image: product.images[0] || "/images/placeholder.png",
      };
      addToCart(cartItem);
      router.push("/cart");
      toast.success(`${product.name} added to cart! Proceeding to checkout...`);
    } catch (error) {
      toast.error("Failed to proceed to checkout");
    }
  };

  const handleSubmitReview = async () => {
    if (!isAuthenticated) {
      toast.error("Please log in to submit a review");
      return;
    }
    if (!newReview.comment.trim()) {
      toast.error("Please enter a comment");
      return;
    }
    try {
      const controller = new AbortController();
      await submitReview(
        { productId: productId, ...newReview },
        { signal: controller.signal }
      );
      const reviewRes = await getReviews(productId, {
        signal: new AbortController().signal,
      });
      if (Array.isArray(reviewRes)) {
        setReviews(reviewRes);
      }
      setNewReview({ rating: 5, comment: "" });
      toast.success("Review submitted!");
    } catch (error) {
      toast.error("Failed to submit review");
    }
  };

  const handleSimilarProductClick = (productId) => {
    router.push(`/product/${productId}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen text-black">
        <Navbar />
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-1/2">
              <Skeleton height={500} />
              <div className="flex gap-2 mt-2">
                {Array(5).fill(0).map((_, i) => (
                  <Skeleton key={i} width={64} height={80} />
                ))}
              </div>
            </div>
            <div className="w-full md:w-1/2">
              <Skeleton height={40} width={300} />
              <Skeleton height={30} width={150} count={2} />
              <Skeleton height={20} width={200} count={3} />
              <Skeleton height={40} width={100} count={3} />
              <Skeleton height={50} width={200} count={2} />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col min-h-screen text-black">
        <Navbar />
        <p className="text-center py-10">Product not found</p>
        <Footer />
      </div>
    );
  }

  const sizes = product.sizes || [];
  const baseDiscount =
    product.mrp && product.price
      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
      : 0;

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex flex-col min-h-screen text-black">
      <Navbar cartCount={cartCount} />
      <div className="p-6 bg-white text-black flex-1">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex flex-row md:flex-col gap-2 w-full md:w-16 order-1 md:order-none">
            {product.images && product.images.length > 0 ? (
              product.images.slice(0, 5).map((img, index) => (
                <button
                  key={index}
                  className={`w-16 h-20 rounded cursor-pointer border ${
                    selectedImage === img ? "border-blue-500" : "border-gray-300"
                  }`}
                  onClick={() => handleImageClick(img)}
                  aria-label={`Select image ${index + 1}`}
                >
                  <Image
                    src={getOptimizedImage(img)}
                    alt={`Thumbnail ${index + 1}`}
                    width={64}
                    height={80}
                    className="w-full h-full object-cover rounded"
                    onError={(e) => (e.currentTarget.src = "/images/placeholder.png")}
                  />
                </button>
              ))
            ) : (
              <Image
                src="/images/placeholder.png"
                alt="Default Thumbnail"
                width={64}
                height={80}
                className="w-16 h-20 rounded border border-gray-300"
              />
            )}
          </div>

          <div className="w-full md:w-1/2 order-2 md:order-none">
            <div
              ref={zoomRef}
              className="relative w-full overflow-hidden border rounded touch-pinch-zoom"
            >
              <Image
                src={getOptimizedImage(selectedImage)}
                alt={product.name}
                width={400}
                height={600}
                className="w-full max-h-[500px] object-contain rounded"
                priority
                onError={(e) => (e.currentTarget.src = "/images/placeholder.png")}
              />
            </div>
          </div>

          <div className="w-full md:w-1/2 order-3">
            <h1 className="text-xl md:text-2xl font-bold mb-4">{product.name}</h1>
            <div className="mb-4">
              <span className="text- Combinatorial Explosions3xl font-bold text-black">
                ₹{product.price ? product.price.toFixed(2) : "N/A"}
              </span>
              {product.mrp && (
                <span className="text-gray-500 line-through ml-2 text-lg">
                  ₹{product.mrp.toFixed(2)}
                </span>
              )}
              {baseDiscount > 0 && (
                <span className="text-green-600 font-semibold ml-2">
                  {baseDiscount}% off
                </span>
              )}
            </div>

            <div className="mb-4 flex items-center">
              <span className="text-yellow-500 text-lg font-semibold">
                {product.rating || 4.5} ★
              </span>
              <span className="ml-2 text-gray-600">
                ({typeof product.reviews === "number" ? product.reviews : reviews.length} Verified Buyers)
              </span>
            </div>

            <div className="mb-4">
              <p className="text-gray-700">Product Code: {product.id}</p>
              <p className="text-gray-700">
                Seller: <span className="text-blue-600">{product.seller || "Clothing Store"}</span>
              </p>
            </div>

            {sizes.length > 0 && (
              <div className="mb-4">
                <h2 className="font-semibold mb-2 text-blue-600">Size</h2>
                <div className="flex gap-2 flex-wrap">
                  {sizes.map((size) => (
                    <button
                      key={size}
                      className={`border px-4 py-2 rounded ${
                        selectedSize === size
                          ? "border-blue-500 bg-blue-100"
                          : "border-gray-300"
                      }`}
                      onClick={() => setSelectedSize(size)}
                      aria-label={`Select size ${size}`}
                    >
                      {size}
                    </button>
                  ))}
                  <button
                    onClick={() => setIsSizeChartOpen(true)}
                    className="text-blue-600 ml-2 hover:underline"
                    aria-label="View size chart"
                  >
                    Size Chart
                  </button>
                </div>
              </div>
            )}

            {product.colors && product.colors.length > 0 && (
              <div className="mb-4">
                <h2 className="font-semibold mb-2 text-blue-600">Color</h2>
                <div className="flex gap-2 flex-wrap">
                  {product.colors.map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full border ${
                        selectedColor === color ? "border-blue-500" : "border-gray-300"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setSelectedColor(color)}
                      aria-label={`Select color ${color}`}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="mb-4">
              <h2 className="font-semibold mb-2 text-blue-600">Quantity</h2>
              <input
                type="number"
                min="1"
                max={product.stockBySize?.[selectedSize] || 10}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="p-2 border rounded w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Select quantity"
              />
            </div>

            <div className="mb-4 text-sm">
              <p className="text-green-600">
                {(product.quantity ?? 0) > 0 ? `In stock (${product.stockBySize?.[selectedSize] || product.quantity} available)` : "Out of stock"}
              </p>
            </div>

            <div className="mb-4 flex gap-4">
              <button
                onClick={handleAddToCart}
                className="bg-yellow-400 hover:bg-yellow-500 text-black px-6 py-3 rounded text-lg font-semibold disabled:opacity-50"
                disabled={product.quantity === 0}
                aria-label="Add to cart"
              >
                Add to Cart
              </button>
              <button
                onClick={handleBuyNow}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded text-lg font-semibold disabled:opacity-50"
                disabled={product.quantity === 0}
                aria-label="Buy now"
              >
                Buy Now
              </button>
            </div>
          </div>
        </div>

        {isSizeChartOpen && product.sizeChart && Object.keys(product.sizeChart).length > 0 && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Size Chart</h2>
                <button
                  onClick={() => setIsSizeChartOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="Close size chart"
                >
                  ✕
                </button>
              </div>
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2">Size</th>
                    <th className="border border-gray-300 p-2">Chest</th>
                    <th className="border border-gray-300 p-2">Shoulder</th>
                    <th className="border border-gray-300 p-2">Length</th>
                    <th className="border border-gray-300 p-2">Sleeve Length</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(product.sizeChart).map(([size, measurements]) => (
                    <tr key={size}>
                      <td className="border border-gray-300 p-2 text-center">{size}</td>
                      <td className="border border-gray-300 p-2 text-center">{measurements.chest}</td>
                      <td className="border border-gray-300 p-2 text-center">{measurements.shoulder}</td>
                      <td className="border border-gray-300 p-2 text-center">{measurements.length}</td>
                      <td className="border border-gray-300 p-2 text-center">{measurements.sleeveLength}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6 text-blue-800">Customer Reviews</h2>
          {reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="border-b py-2">
                  <p className="text-yellow-500 font-semibold">{review.rating} ★</p>
                  <p className="text-gray-600">{review.comment}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No reviews yet.</p>
          )}
          {isAuthenticated && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Write a Review</h3>
              <select
                value={newReview.rating}
                onChange={(e) => setNewReview({ ...newReview, rating: parseInt(e.target.value) })}
                className="p-2 border rounded mb-2"
                aria-label="Select rating"
              >
                {[1, 2, 3, 4, 5].map((r) => (
                  <option key={r} value={r}>{r} ★</option>
                ))}
              </select>
              <textarea
                value={newReview.comment}
                onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                className="w-full p-2 border rounded mb-2"
                placeholder="Write your review..."
                aria-label="Review comment"
              />
              <button
                onClick={handleSubmitReview}
                className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
                aria-label="Submit review"
              >
                Submit Review
              </button>
            </div>
          )}
        </div>

        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6 text-blue-800">Similar Products</h2>
          {similarLoading ? (
            <div className="flex gap-4">
              {Array(3).fill(0).map((_, i) => (
                <Skeleton key={i} width={200} height={300} />
              ))}
            </div>
          ) : similarProducts.length > 0 ? (
            <div className="flex overflow-x-auto gap-4 pb-4">
              {similarProducts.map((similarProduct) => (
                <SimilarProductCard
                  key={similarProduct.id}
                  product={similarProduct}
                  onClick={() => handleSimilarProductClick(similarProduct.id)}
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-600">No similar products found.</p>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}