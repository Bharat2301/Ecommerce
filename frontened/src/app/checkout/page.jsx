'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import { useApi } from '@/hooks/useApi';
import toast from 'react-hot-toast';
import { CreditCard } from 'lucide-react';
import api from '@/utils/api';

export default function Checkout() {
  const { cart, total, clearCart } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const [shippingDetails, setShippingDetails] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    pincode: '',
    city: '',
    state: '',
  });
  const [loading, setLoading] = useState(false);
  const { handleRequest } = useApi();
  const router = useRouter();

  const handleChange = (e) => {
    setShippingDetails({ ...shippingDetails, [e.target.name]: e.target.value });
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Please log in to checkout');
      router.push('/login?redirect=/checkout');
      return;
    }
    setLoading(true);
    try {
      const response = await handleRequest(
        api.post('/api/payments/create', {
          amount: total,
          currency: 'INR',
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            size: item.size,
          })),
          discount: 0,
          shippingDetails,
        })
      );

      if (response.success) {
        const { orderId, dbOrderId, amount, currency } = response.data;
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
          amount,
          currency,
          name: 'KS', // Add your store name here
          order_id: orderId,
          handler: async (response) => {
            try {
              const verifyResponse = await handleRequest(
                api.post('/api/payments/verify', {
                  orderId,
                  paymentId: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                  dbOrderId,
                })
              );
              if (verifyResponse.success) {
                clearCart();
                router.push(`/orders?orderId=${dbOrderId}`);
                toast.success('Order placed successfully!');
              }
            } catch (error) {
              toast.error('Payment verification failed');
            }
          },
          prefill: {
            name: shippingDetails.name,
            email: shippingDetails.email,
            contact: shippingDetails.phone,
          },
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (error) {
      toast.error('Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">Checkout</h1>
      <form onSubmit={handleCheckout} className="space-y-4">
        <h2 className="text-lg font-semibold">Shipping Details</h2>
        <input
          type="text"
          name="name"
          placeholder="Full Name"
          value={shippingDetails.name}
          onChange={handleChange}
          className="w-full border rounded p-2"
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={shippingDetails.email}
          onChange={handleChange}
          className="w-full border rounded p-2"
          required
        />
        <input
          type="text"
          name="phone"
          placeholder="Phone Number"
          value={shippingDetails.phone}
          onChange={handleChange}
          className="w-full border rounded p-2"
          required
        />
        <input
          type="text"
          name="address"
          placeholder="Address"
          value={shippingDetails.address}
          onChange={handleChange}
          className="w-full border rounded p-2"
          required
        />
        <div className="flex gap-2">
          <input
            type="text"
            name="pincode"
            placeholder="Pincode"
            value={shippingDetails.pincode}
            onChange={handleChange}
            className="w-full border rounded p-2"
            required
          />
          <input
            type="text"
            name="city"
            placeholder="City"
            value={shippingDetails.city}
            onChange={handleChange}
            className="w-full border rounded p-2"
            required
          />
        </div>
        <input
          type="text"
          name="state"
          placeholder="State"
          value={shippingDetails.state}
          onChange={handleChange}
          className="w-full border rounded p-2"
          required
        />
        <button
          type="submit"
          disabled={loading || cart.length === 0}
          className="w-full bg-primary text-white py-2 rounded hover:bg-blue-600 flex items-center justify-center disabled:opacity-50"
        >
          <CreditCard className="mr-2" />
          {loading ? 'Processing...' : 'Pay Now'}
        </button>
      </form>
    </div>
  );
}