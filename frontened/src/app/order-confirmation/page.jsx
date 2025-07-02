'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApi } from '@/hooks/useApi';
import api from '@/utils/api';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import toast from 'react-hot-toast';
import { CheckCircle } from 'lucide-react';

export default function OrderConfirmation() {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const { handleRequest } = useApi();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        toast.error('Invalid order ID');
        router.push('/');
        return;
      }
      try {
        const response = await handleRequest(api.get(`/api/orders/${orderId}`));
        if (response.success) {
          setOrder(response.data);
        }
      } catch (error) {
        toast.error('Failed to load order details');
        router.push('/');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId, handleRequest, router]);

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <Skeleton count={3} height={100} />
      </div>
    );
  }

  if (!order) {
    return <div className="container mx-auto p-4">Order not found.</div>;
  }

  return (
    <div className="container mx-auto p-4 text-black">
      <div className="flex items-center justify-center mb-4">
        <CheckCircle className="w-12 h-12 text-green-500 mr-2" />
        <h1 className="text-2xl font-bold">Order Confirmed!</h1>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl mx-auto">
        <h2 className="font-semibold text-lg">Order #{order.id}</h2>
        <p>Status: {order.status}</p>
        <p>Total: ₹{order.totalAmount}</p>
        <p>Date: {new Date(order.createdAt).toLocaleDateString()}</p>
        <div className="mt-4">
          <h3 className="font-semibold">Order Items</h3>
          {order.orderItems.map((item, index) => (
            <div key={index} className="flex items-center gap-2 mt-2">
              <img
                src={item.product.images[0] || 'https://via.placeholder.com/100'}
                alt={item.product.name}
                className="w-12 h-12 object-cover"
                onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/100')}
              />
              <p>
                {item.product.name} x {item.quantity} @ ₹{item.price}
              </p>
            </div>
          ))}
        </div>
        <button
          onClick={() => router.push('/orders')}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          aria-label="View all orders"
        >
          View All Orders
        </button>
      </div>
    </div>
  );
}