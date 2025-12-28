import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

const RestaurantStatusContext = createContext();

export const RestaurantStatusProvider = ({ children }) => {
  const [statuses, setStatuses] = useState({});
  const [lastCheck, setLastCheck] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const API_URL = process.env.NODE_ENV === 'production'
    ? 'https://foodles-backend-lpzp.onrender.com'
    : 'http://localhost:5000';

  const fetchStatuses = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/restaurants/status`);
      const data = await response.json();
      
      console.log('Pre-fetched restaurant statuses:', data);
      
      if (data.statuses) {
        setStatuses(data.statuses);
        setLastCheck(data.metadata?.lastChecked);
      }
    } catch (error) {
      console.error('Status pre-fetch failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchStatuses();
    const interval = setInterval(fetchStatuses, 5000);
    return () => clearInterval(interval);
  }, [fetchStatuses]);

  return (
    <RestaurantStatusContext.Provider value={{ 
      statuses, 
      lastCheck, 
      isLoading,
      refreshStatuses: fetchStatuses 
    }}>
      {children}
    </RestaurantStatusContext.Provider>
  );
};

export const useRestaurantStatus = () => {
  const context = useContext(RestaurantStatusContext);
  if (!context) {
    throw new Error('useRestaurantStatus must be used within a RestaurantStatusProvider');
  }
  return context;
};
