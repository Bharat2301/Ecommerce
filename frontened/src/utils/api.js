import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token (if available)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to standardize error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const errorMessage =
      error.response?.data?.error || error.message || 'An error occurred';
    return Promise.reject(new Error(errorMessage));
  }
);

// Fetch products with optional query parameters (e.g., category)
export const fetchProducts = async (params = {}, options = {}) => {
  try {
    const query = new URLSearchParams(params).toString();
    const response = await api.get(`/products${query ? `?${query}` : ''}`, {
      signal: options.signal,
    });
    return response.data;
  } catch (error) {
    throw new Error(error.message);
  }
};

// Fetch a single product by ID
export const getProduct = async (productId, options = {}) => {
  try {
    const response = await api.get(`/products/${productId}`, {
      signal: options.signal,
    });
    return response.data;
  } catch (error) {
    throw new Error(error.message);
  }
};

// Fetch categories
export const getCategories = async (options = {}) => {
  try {
    const response = await api.get('/categories', { signal: options.signal });
    return response.data;
  } catch (error) {
    throw new Error(error.message);
  }
};

// Fetch reviews for a product
export const getReviews = async (productId, options = {}) => {
  try {
    const response = await api.get(`/reviews/${productId}`, {
      signal: options.signal,
    });
    return response.data;
  } catch (error) {
    throw new Error(error.message);
  }
};

// Submit a review for a product
export const submitReview = async (reviewData, options = {}) => {
  try {
    const response = await api.post('/reviews', reviewData, {
      signal: options.signal,
    });
    return response.data;
  } catch (error) {
    throw new Error(error.message);
  }
};

export default api;