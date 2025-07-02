const axios = require('axios');

const SHIPROCKET_API = 'https://apiv2.shiprocket.in/v1/external';

let shiprocketToken = null;

// Get Shiprocket auth token
const getShiprocketToken = async () => {
  if (shiprocketToken && shiprocketToken.expiresAt > Date.now()) {
    return shiprocketToken.token;
  }

  try {
    const response = await axios.post(`${SHIPROCKET_API}/auth/login`, {
      email: process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD,
    });

    shiprocketToken = {
      token: response.data.token,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // Valid for 24 hours
    };

    console.log('Shiprocket token fetched');
    return shiprocketToken.token;
  } catch (error) {
    console.error('Shiprocket login failed:', error);
    throw new Error('Unable to authenticate with Shiprocket');
  }
};

// Create a Shiprocket order
const createShiprocketOrder = async (orderData, retries = 3) => {
  const token = await getShiprocketToken();
  try {
    const response = await axios.post(`${SHIPROCKET_API}/orders/create/adhoc`, orderData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('Shiprocket order created:', response.data.order_id);
    return response.data;
  } catch (error) {
    if (error.response?.status === 429 && retries > 0) {
      console.warn(`Rate limit hit, retrying in 1s... (${retries} attempts left)`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return createShiprocketOrder(orderData, retries - 1);
    }
    console.error('Shiprocket order creation failed:', error);
    throw new Error('Unable to create Shiprocket order');
  }
};

// Get tracking info for a Shiprocket order
const getTrackingInfo = async (orderId, retries = 3) => {
  const token = await getShiprocketToken();
  try {
    const response = await axios.get(`${SHIPROCKET_API}/orders/track?order_id=${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`Fetched tracking for Shiprocket order ${orderId}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 429 && retries > 0) {
      console.warn(`Rate limit hit, retrying in 1s... (${retries} attempts left)`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return getTrackingInfo(orderId, retries - 1);
    }
    console.error('Shiprocket tracking failed:', error);
    throw new Error('Unable to fetch tracking info');
  }
};

module.exports = {
  getShiprocketToken,
  createShiprocketOrder,
  getTrackingInfo,
};
