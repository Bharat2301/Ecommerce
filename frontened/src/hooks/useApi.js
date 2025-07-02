import { useState } from 'react';
import axios from 'axios';

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const handleRequest = async (request) => {
    setLoading(true);
    setError(null);
    try {
      const response = await request;
      console.log('API response:', {
        url: response.config.url,
        data: response.data,
        status: response.status,
      });
      if (response.status >= 200 && response.status < 300) {
        setData(response.data);
        return response.data;
      } else {
        const errorMsg = response.data?.error || 'Request failed';
        console.error('API error:', {
          url: response.config.url,
          status: response.status,
          data: response.data,
        });
        setError(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      let errorMsg;
      if (error.response?.data?.error) {
        if (typeof error.response.data.error === 'string') {
          errorMsg = error.response.data.error;
        } else if (Array.isArray(error.response.data.error)) {
          errorMsg = error.response.data.error.map((e) => e.message).join(', ');
        } else {
          errorMsg = 'Request failed';
        }
      } else {
        errorMsg = error.message || 'Request failed';
      }
      console.error('API error:', {
        url: error.config?.url,
        message: error.message,
        response: error.response?.data,
      });
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, data, handleRequest };
};
