"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import { Pie, Bar } from "react-chartjs-2";
import { toast } from "react-hot-toast";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

export default function AdminPanel({ setPage }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [products, setProducts] = useState([]);
  const [offerCodes, setOfferCodes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    price: "",
    mrp: "",
    category: "Men",
    colors: ["#000000", "#FF0000", "#00FF00"],
    sizes: ["S", "M", "L", "XL"],
    quantity: "",
    sizeQuantities: { S: 0, M: 0, L: 0, XL: 0 },
    mainImage: null,
    angleImages: [],
    mainImageUrl: "",
    angleImageUrls: [],
  });
  const [editingProduct, setEditingProduct] = useState(null);
  const [newOfferCode, setNewOfferCode] = useState({
    code: "",
    discount: "",
    expiryDate: "",
  });
  const [editingOfferCode, setEditingOfferCode] = useState(null);

  useEffect(() => {
    fetchProducts();
    fetchOfferCodes();
    fetchOrders();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await axios.get("http://localhost:5000/api/products", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setProducts(res.data);
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Failed to fetch products";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchOfferCodes = async () => {
    try {
      setLoading(true);
      const res = await axios.get("http://localhost:5000/api/offers", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setOfferCodes(res.data);
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Failed to fetch offer codes";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await axios.get("http://localhost:5000/api/orders", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setOrders(res.data);
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Failed to fetch orders";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const uploadImagesToCloudinary = async (files) => {
    const uploadPromises = files.map(
      (file) =>
        new Promise((resolve, reject) => {
          const formData = new FormData();
          formData.append("file", file);
          formData.append(
            "upload_preset",
            process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
          );
          fetch(
            `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
            {
              method: "POST",
              body: formData,
            }
          )
            .then((res) => res.json())
            .then((data) => resolve(data.secure_url))
            .catch((err) => reject(err));
        })
    );
    return Promise.all(uploadPromises);
  };

  const handleCreateProduct = async () => {
    try {
      setError("");
      setLoading(true);

      if (!newProduct.name) {
        setError("Product name is required");
        return;
      }
      if (!newProduct.price || parseFloat(newProduct.price) <= 0) {
        setError("Valid price is required");
        return;
      }
      if (!newProduct.category) {
        setError("Category is required");
        return;
      }

      const totalQuantity = Object.values(newProduct.sizeQuantities).reduce(
        (sum, qty) => sum + qty,
        0
      );
      if (totalQuantity <= 0) {
        setError("At least one size must have a quantity greater than 0");
        return;
      }

      let images = [];
      if (newProduct.mainImage) {
        const mainImageUrl = await uploadImagesToCloudinary([newProduct.mainImage]);
        images.push(mainImageUrl[0]);
      } else if (newProduct.mainImageUrl) {
        images.push(newProduct.mainImageUrl);
      }

      if (newProduct.angleImages.length > 0) {
        const angleImageUrls = await uploadImagesToCloudinary(
          newProduct.angleImages.slice(0, 4)
        );
        images = [...images, ...angleImageUrls];
      }
      if (newProduct.angleImageUrls.length > 0) {
        images = [
          ...images,
          ...newProduct.angleImageUrls.slice(0, 4 - newProduct.angleImages.length),
        ];
      }

      if (images.length === 0) {
        setError("At least one main image is required");
        return;
      }

      const productData = {
        name: newProduct.name,
        description: newProduct.description,
        price: parseFloat(newProduct.price),
        mrp: newProduct.mrp ? parseFloat(newProduct.mrp) : undefined,
        category: newProduct.category,
        colors: newProduct.colors.filter((c) => c),
        sizes: newProduct.sizes.filter((s) => s),
        stockBySize: newProduct.sizeQuantities,
        images,
      };

      await axios.post("http://localhost:5000/api/products", productData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });

      toast.success("Product created successfully!");
      setNewProduct({
        name: "",
        description: "",
        price: "",
        mrp: "",
        category: "Men",
        colors: ["#000000", "#FF0000", "#00FF00"],
        sizes: ["S", "M", "L", "XL"],
        quantity: "",
        sizeQuantities: { S: 0, M: 0, L: 0, XL: 0 },
        mainImage: null,
        angleImages: [],
        mainImageUrl: "",
        angleImageUrls: [],
      });
      fetchProducts();
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Failed to create product";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;
    try {
      setError("");
      setLoading(true);

      if (!editingProduct.name) {
        setError("Product name is required");
        return;
      }
      if (!editingProduct.price || editingProduct.price <= 0) {
        setError("Price must be greater than 0");
        return;
      }
      if (!editingProduct.category) {
        setError("Category is required");
        return;
      }
      if (
        !editingProduct.images ||
        editingProduct.images.length === 0 ||
        !editingProduct.images[0]
      ) {
        setError("At least one main image URL is required");
        return;
      }

      const sizeQuantities = editingProduct.sizeQuantities || {};
      const totalQuantity = Object.values(sizeQuantities).reduce(
        (sum, qty) => sum + (qty || 0),
        0
      );
      if (totalQuantity <= 0) {
        setError("At least one size must have a quantity greater than 0");
        return;
      }

      const productData = {
        name: editingProduct.name,
        description: editingProduct.description || "",
        price: parseFloat(editingProduct.price.toString()),
        mrp: editingProduct.mrp
          ? parseFloat(editingProduct.mrp.toString())
          : undefined,
        category: editingProduct.category,
        colors: editingProduct.colors?.filter((c) => c) || [],
        sizes: editingProduct.sizes?.filter((s) => s) || [],
        stockBySize: sizeQuantities,
        images: editingProduct.images.filter((img) => img),
      };

      console.log("Updating product with payload:", productData);

      await axios.put(
        `http://localhost:5000/api/products/${editingProduct.id}`,
        productData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );

      toast.success("Product updated successfully!");
      setEditingProduct(null);
      fetchProducts();
    } catch (err) {
      console.error("Update product error:", err.response?.data);
      const errorMessage = err.response?.data?.error || "Failed to update product";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    try {
      setError("");
      setLoading(true);
      await axios.delete(`http://localhost:5000/api/products/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      toast.success("Product deleted successfully!");
      fetchProducts();
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Failed to delete product";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOfferCode = async () => {
    try {
      setError("");
      setLoading(true);

      if (!newOfferCode.code) {
        setError("Offer code is required");
        return;
      }
      if (!newOfferCode.discount || parseFloat(newOfferCode.discount) <= 0) {
        setError("Valid discount percentage is required");
        return;
      }
      if (!newOfferCode.expiryDate) {
        setError("Expiry date is required");
        return;
      }

      const offerData = {
        code: newOfferCode.code,
        discount: parseFloat(newOfferCode.discount),
        expiryDate: newOfferCode.expiryDate,
      };

      await axios.post("http://localhost:5000/api/offer-codes", offerData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });

      toast.success("Offer code created successfully!");
      setNewOfferCode({ code: "", discount: "", expiryDate: "" });
      fetchOfferCodes();
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Failed to create offer code";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOfferCode = async () => {
    if (!editingOfferCode) return;
    try {
      setError("");
      setLoading(true);

      if (!editingOfferCode.code) {
        setError("Offer code is required");
        return;
      }
      if (!editingOfferCode.discount || editingOfferCode.discount <= 0) {
        setError("Valid discount percentage is required");
        return;
      }

      const offerData = {
        code: editingOfferCode.code,
        discount: parseFloat(editingOfferCode.discount.toString()),
        expiryDate: editingOfferCode.expiryDate,
      };

      await axios.put(
        `http://localhost:5000/api/offer-codes/${editingOfferCode.id}`,
        offerData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );

      toast.success("Offer code updated successfully!");
      setEditingOfferCode(null);
      fetchOfferCodes();
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Failed to update offer code";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOfferCode = async (id) => {
    try {
      setError("");
      setLoading(true);
      await axios.delete(`http://localhost:5000/api/offer-codes/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      toast.success("Offer code deleted successfully!");
      fetchOfferCodes();
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Failed to delete offer code";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      setError("");
      setLoading(true);
      await axios.put(
        `http://localhost:5000/api/orders/${orderId}`,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );
      toast.success("Order status updated successfully!");
      fetchOrders();
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Failed to update order status";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);

  const categoryData = {
    labels: ["Men", "Women", "Kids", "Bags"],
    datasets: [
      {
        label: "Sales by Category",
        data: [
          products.filter((p) => p.category === "Men").length,
          products.filter((p) => p.category === "Women").length,
          products.filter((p) => p.category === "Kids").length,
          products.filter((p) => p.category === "Bags").length,
        ],
        backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0"],
      },
    ],
  };

  const revenueData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    datasets: [
      {
        label: "Monthly Revenue",
        data: Array(12)
          .fill(0)
          .map((_, i) =>
            orders
              .filter((o) => new Date(o.createdAt).getMonth() === i)
              .reduce((sum, o) => sum + o.totalPrice, 0)
          ),
        backgroundColor: "#36A2EB",
      },
    ],
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <div className="w-64 bg-white shadow-lg">
        <div className="p-4">
          <h1 className="text-2xl font-bold text-red-600">Admin Panel</h1>
        </div>
        <nav className="mt-4">
          {["dashboard", "products", "offers", "orders"].map((tab) => (
            <button
              key={tab}
              className={`w-full text-left p-4 hover:bg-red-100 capitalize ${
                activeTab === tab ? "bg-red-100 text-red-600 font-semibold" : "text-gray-600"
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
          <button
            className="w-full text-left p-4 hover:bg-red-100 text-gray-600"
            onClick={() => {
              localStorage.removeItem("token");
              setPage("home");
            }}
          >
            Logout
          </button>
        </nav>
      </div>

      <div className="flex-1 p-6">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Admin Dashboard</h1>
        {error && (
          <p className="text-red-600 mb-4 text-center bg-red-100 p-2 rounded">{error}</p>
        )}
        {loading && (
          <div className="text-center text-gray-600 mb-4">
            <svg
              className="animate-spin h-5 w-5 mr-2 inline-block"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Loading...
          </div>
        )}

        {activeTab === "dashboard" && (
          <div>
            <h2 className="text-2xl font-semibold mb-4 text-gray-700">Dashboard Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-lg font-semibold text-gray-600">Total Revenue</h3>
                <p className="text-2xl text-green-600">₹{totalRevenue.toFixed(2)}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-lg font-semibold text-gray-600">Total Orders</h3>
                <p className="text-2xl text-blue-600">{orders.length}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-lg font-semibold text-gray-600">Total Products</h3>
                <p className="text-2xl text-red-600">{products.length}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-lg font-semibold mb-4 text-gray-600">Sales by Category</h3>
                <Pie data={categoryData} />
              </div>
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-lg font-semibold mb-4 text-gray-600">Monthly Revenue</h3>
                <Bar data={revenueData} />
              </div>
            </div>
          </div>
        )}

        {activeTab === "products" && (
          <div>
            <h2 className="text-2xl font-semibold mb-4 text-gray-700">Manage Products</h2>
            <div className="mb-6 bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-semibold mb-4 text-gray-600">Add New Product</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    placeholder="Product Name"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    className="p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price</label>
                  <input
                    type="number"
                    placeholder="Price"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    className="p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">MRP (Optional)</label>
                  <input
                    type="number"
                    placeholder="MRP"
                    value={newProduct.mrp}
                    onChange={(e) => setNewProduct({ ...newProduct, mrp: e.target.value })}
                    className="p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    className="p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Men">Men</option>
                    <option value="Women">Women</option>
                    <option value="Kids">Kids</option>
                    <option value="Bags">Bags</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Colors (Comma-separated hex codes)</label>
                  <input
                    type="text"
                    placeholder="Colors (e.g., #000000,#FF0000)"
                    value={newProduct.colors.join(",")}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, colors: e.target.value.split(",").map((c) => c.trim()) })
                    }
                    className="p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Sizes (Comma-separated)</label>
                  <input
                    type="text"
                    placeholder="Sizes (e.g., S,M,L,XL)"
                    value={newProduct.sizes.join(",")}
                    onChange={(e) => {
                      const sizes = e.target.value.split(",").map((s) => s.trim()).filter((s) => s);
                      const sizeQuantities = sizes.reduce((acc, size) => ({
                        ...acc,
                        [size]: newProduct.sizeQuantities[size] || 0,
                      }), {});
                      setNewProduct({ ...newProduct, sizes, sizeQuantities });
                    }}
                    className="p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Size Quantities</label>
                  {newProduct.sizes.map((size) => (
                    <div key={size} className="flex items-center mb-2">
                      <label className="w-20 text-sm">{size}</label>
                      <input
                        type="number"
                        min="0"
                        value={newProduct.sizeQuantities[size] || 0}
                        onChange={(e) =>
                          setNewProduct({
                            ...newProduct,
                            sizeQuantities: {
                              ...newProduct.sizeQuantities,
                              [size]: parseInt(e.target.value, 10) || 0,
                            },
                          })
                        }
                        className="p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Main Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, mainImage: e.target.files?.[0] || null })
                    }
                    className="p-2 border rounded w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Main Image URL (Optional)</label>
                  <input
                    type="text"
                    placeholder="Main Image URL"
                    value={newProduct.mainImageUrl}
                    onChange={(e) => setNewProduct({ ...newProduct, mainImageUrl: e.target.value })}
                    className="p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Additional Angle Images (Up to 4)</label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, angleImages: Array.from(e.target.files || []).slice(0, 4) })
                    }
                    className="p-2 border rounded w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Additional Angle Image URLs (Comma-separated, optional)</label>
                  <input
                    type="text"
                    placeholder="Angle Image URLs (optional)"
                    value={newProduct.angleImageUrls.join(",")}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, angleImageUrls: e.target.value.split(",").map((url) => url.trim()) })
                    }
                    className="p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    placeholder="Description"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    className="p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
              </div>
              <button
                onClick={handleCreateProduct}
                disabled={loading}
                className={`mt-4 px-6 py-2 rounded text-white font-medium ${
                  loading ? "bg-green-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {loading ? "Adding..." : "Add Product"}
              </button>
            </div>

            {editingProduct && (
              <div className="mb-6 bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-lg font-semibold mb-4 text-gray-600">Edit Product</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      placeholder="Name"
                      value={editingProduct.name}
                      onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                      className="p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Price</label>
                    <input
                      type="number"
                      placeholder="Price"
                      value={editingProduct.price}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 })
                      }
                      className="p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">MRP (Optional)</label>
                    <input
                      type="number"
                      placeholder="MRP"
                      value={editingProduct.mrp || ""}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          mrp: e.target.value ? parseFloat(e.target.value) : undefined,
                        })
                      }
                      className="p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <select
                      value={editingProduct.category}
                      onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                      className="p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Men">Men</option>
                      <option value="Women">Women</option>
                      <option value="Kids">Kids</option>
                      <option value="Bags">Bags</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Colors (Comma-separated hex codes)</label>
                    <input
                      type="text"
                      placeholder="Colors (e.g., #000000,#FF0000)"
                      value={editingProduct.colors?.join(",") || ""}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          colors: e.target.value.split(",").map((c) => c.trim()).filter((c) => c),
                        })
                      }
                      className="p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Sizes (Comma-separated)</label>
                    <input
                      type="text"
                      placeholder="Sizes (e.g., S,M,L,XL)"
                      value={editingProduct.sizes?.join(",") || ""}
                      onChange={(e) => {
                        const sizes = e.target.value.split(",").map((s) => s.trim()).filter((s) => s);
                        const sizeQuantities = sizes.reduce(
                          (acc, size) => ({
                            ...acc,
                            [size]: editingProduct.sizeQuantities?.[size] || 0,
                          }),
                          {}
                        );
                        setEditingProduct({ ...editingProduct, sizes, sizeQuantities });
                      }}
                      className="p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Size Quantities</label>
                    {editingProduct.sizes?.map((size) => (
                      <div key={size} className="flex items-center mb-2">
                        <label className="w-20 text-sm">{size}</label>
                        <input
                          type="number"
                          min="0"
                          value={editingProduct.sizeQuantities?.[size] || 0}
                          onChange={(e) =>
                            setEditingProduct({
                              ...editingProduct,
                              sizeQuantities: {
                                ...editingProduct.sizeQuantities,
                                [size]: parseInt(e.target.value, 10) || 0,
                              },
                            })
                          }
                          className="p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Main Image URL</label>
                    <input
                      type="text"
                      placeholder="Main Image URL"
                      value={editingProduct.images?.[0] || ""}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          images: [e.target.value, ...(editingProduct.images?.slice(1) || [])],
                        })
                      }
                      className="p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Additional Angle Image URLs (Comma-separated)</label>
                    <input
                      type="text"
                      placeholder="Angle Image URLs"
                      value={editingProduct.images?.slice(1).join(",") || ""}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          images: [
                            editingProduct.images?.[0] || "",
                            ...e.target.value.split(",").map((url) => url.trim()).slice(0, 4),
                          ],
                        })
                      }
                      className="p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      placeholder="Description"
                      value={editingProduct.description}
                      onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                      className="p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>
                </div>
                <div className="mt-4 flex space-x-2">
                  <button
                    onClick={handleUpdateProduct}
                    disabled={loading}
                    className={`px-6 py-2 rounded text-white font-medium ${
                      loading ? "bg-green-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    {loading ? "Updating..." : "Update Product"}
                  </button>
                  <button
                    onClick={() => setEditingProduct(null)}
                    className="px-6 py-2 rounded text-white font-medium bg-gray-600 hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-semibold mb-4 text-gray-600">Product List</h3>
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex justify-between items-center mb-4 p-4 border rounded bg-gray-50 hover:bg-gray-100"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex space-x-2">
                      {product.images.slice(0, 5).map((image, index) => (
                        <img
                          key={index}
                          src={image || "https://via.placeholder.com/64"}
                          alt={`${product.name} ${index + 1}`}
                          className="w-16 h-16 object-cover rounded"
                        />
                      ))}
                    </div>
                    <div>
                      <p className="text-lg font-semibold">{product.name}</p>
                      <p className="text-sm text-gray-600">
                        ₹{product.price.toFixed(2)} {product.mrp && <span>(MRP: ₹{product.mrp.toFixed(2)})</span>}
                      </p>
                      <p className="text-sm text-gray-600">Category: {product.category}</p>
                      <p className="text-sm text-gray-600">
                        Total Quantity:{" "}
                        {product.sizeQuantities
                          ? Object.values(product.sizeQuantities).reduce((sum, qty) => sum + qty, 0)
                          : 0}
                      </p>
                      {product.sizeQuantities && (
                        <p className="text-sm text-gray-600">
                          Size Quantities:{" "}
                          {Object.entries(product.sizeQuantities)
                            .map(([size, qty]) => `${size}: ${qty}`)
                            .join(", ")}
                        </p>
                      )}
                      <p className="text-sm text-gray-600">Colors: {product.colors?.join(", ") || "N/A"}</p>
                      <p className="text-sm text-gray-600">Sizes: {product.sizes?.join(", ") || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setEditingProduct(product)}
                      className="px-4 py-2 rounded text-white font-medium bg-blue-600 hover:bg-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="px-4 py-2 rounded text-white font-medium bg-red-600 hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "offers" && (
          <div>
            <h2 className="text-2xl font-semibold mb-4 text-gray-700">Manage Offer Codes</h2>
            <div className="mb-6 bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-semibold mb-4 text-gray-600">Add New Offer Code</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Code</label>
                  <input
                    type="text"
                    placeholder="Offer Code"
                    value={newOfferCode.code}
                    onChange={(e) => setNewOfferCode({ ...newOfferCode, code: e.target.value })}
                    className="p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Discount (%)</label>
                  <input
                    type="number"
                    placeholder="Discount"
                    value={newOfferCode.discount}
                    onChange={(e) => setNewOfferCode({ ...newOfferCode, discount: e.target.value })}
                    className="p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
                  <input
                    type="date"
                    value={newOfferCode.expiryDate}
                    onChange={(e) => setNewOfferCode({ ...newOfferCode, expiryDate: e.target.value })}
                    className="p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <button
                onClick={handleCreateOfferCode}
                disabled={loading}
                className={`mt-4 px-6 py-2 rounded text-white font-medium ${
                  loading ? "bg-green-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {loading ? "Adding..." : "Add Offer Code"}
              </button>
            </div>

            {editingOfferCode && (
              <div className="mb-6 bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-lg font-semibold mb-4 text-gray-600">Edit Offer Code</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Code</label>
                    <input
                      type="text"
                      placeholder="Offer Code"
                      value={editingOfferCode.code}
                      onChange={(e) => setEditingOfferCode({ ...editingOfferCode, code: e.target.value })}
                      className="p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Discount (%)</label>
                    <input
                      type="number"
                      placeholder="Discount"
                      value={editingOfferCode.discount}
                      onChange={(e) =>
                        setEditingOfferCode({ ...editingOfferCode, discount: parseFloat(e.target.value) })
                      }
                      className="p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
                    <input
                      type="date"
                      value={editingOfferCode.expiryDate.split("T")[0]}
                      onChange={(e) => setEditingOfferCode({ ...editingOfferCode, expiryDate: e.target.value })}
                      className="p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="mt-4 flex space-x-2">
                  <button
                    onClick={handleUpdateOfferCode}
                    disabled={loading}
                    className={`px-6 py-2 rounded text-white font-medium ${
                      loading ? "bg-green-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    {loading ? "Updating..." : "Update Offer Code"}
                  </button>
                  <button
                    onClick={() => setEditingOfferCode(null)}
                    className="px-6 py-2 rounded text-white font-medium bg-gray-600 hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-semibold mb-4 text-gray-600">Offer Code List</h3>
              {offerCodes.map((offer) => (
                <div
                  key={offer.id}
                  className="flex justify-between items-center mb-4 p-4 border rounded bg-gray-50 hover:bg-gray-100"
                >
                  <div>
                    <p className="text-lg font-semibold">{offer.code}</p>
                    <p className="text-sm text-gray-600">Discount: {offer.discount}%</p>
                    <p className="text-sm text-gray-600">
                      Expires: {new Date(offer.expiryDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setEditingOfferCode(offer)}
                      className="px-4 py-2 rounded text-white font-medium bg-blue-600 hover:bg-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteOfferCode(offer.id)}
                      className="px-4 py-2 rounded text-white font-medium bg-red-600 hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "orders" && (
          <div>
            <h2 className="text-2xl font-semibold mb-4 text-gray-700">Manage Orders</h2>
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-semibold mb-4 text-gray-600">Order List</h3>
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex justify-between items-center mb-4 p-4 border rounded bg-gray-50 hover:bg-gray-100"
                >
                  <div>
                    <p className="text-lg font-semibold">Order #{order.id}</p>
                    <p className="text-sm text-gray-600">Total: ₹{order.totalPrice.toFixed(2)}</p>
                    <p className="text-sm text-gray-600">Quantity: {order.quantity}</p>
                    <p className="text-sm text-gray-600">Status: {order.status}</p>
                    <p className="text-sm text-gray-600">
                      Placed: {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex space-x-2 items-center">
                    <select
                      value={order.status}
                      onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                      className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <button
                      onClick={() => handleUpdateOrderStatus(order.id, order.status)}
                      className="px-4 py-2 rounded text-white font-medium bg-blue-600 hover:bg-blue-700"
                    >
                      Update Status
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}