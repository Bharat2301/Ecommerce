'use client';

import { useEffect, useState } from 'react';
import { useApi } from '@/hooks/useApi';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import toast from 'react-hot-toast';
import { Package } from 'lucide-react';
import api from '@/utils/api';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { handleRequest } = useApi();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await handleRequest(api.get('/api/orders/user'));
        if (response.success) {
          setOrders(response.data);
        }
      } catch (error) {
        toast.error('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Your Orders</h1>
      {loading ? (
        <Skeleton count={3} height={100} />
      ) : orders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        orders.map((order) => (
          <div key={order.id} className="border p-4 mb-4 rounded">
            <div className="flex items-center">
              <Package className="mr-2" />
              <h2 className="font-semibold">Order #{order.id}</h2>
            </div>
            <p>Status: {order.status}</p>
            <p>Total: ₹{order.totalAmount}</p>
            <p>Date: {new Date(order.createdAt).toLocaleDateString()}</p>
            <div className="mt-2">
              {order.orderItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
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
          </div>
        ))
      )}
    </div>
  );
}