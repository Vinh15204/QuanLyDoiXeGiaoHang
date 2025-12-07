import React, { createContext, useContext, useState, useEffect } from 'react';

const RouteContext = createContext();

export function RouteProvider({ children }) {
  // Đọc dữ liệu từ localStorage khi khởi tạo
  const [optimizedRoutes, setOptimizedRoutes] = useState(() => {
    try {
      const saved = localStorage.getItem('optimizedRoutes');
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Error loading optimizedRoutes:', error);
      return null;
    }
  });
  
  const [optimizationStats, setOptimizationStats] = useState(() => {
    try {
      const saved = localStorage.getItem('optimizationStats');
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Error loading optimizationStats:', error);
      return null;
    }
  });

  // Lưu vào localStorage mỗi khi thay đổi
  useEffect(() => {
    if (optimizedRoutes !== null) {
      try {
        localStorage.setItem('optimizedRoutes', JSON.stringify(optimizedRoutes));
      } catch (error) {
        console.error('Error saving optimizedRoutes:', error);
      }
    } else {
      localStorage.removeItem('optimizedRoutes');
    }
  }, [optimizedRoutes]);
  
  useEffect(() => {
    if (optimizationStats !== null) {
      try {
        localStorage.setItem('optimizationStats', JSON.stringify(optimizationStats));
      } catch (error) {
        console.error('Error saving optimizationStats:', error);
      }
    } else {
      localStorage.removeItem('optimizationStats');
    }
  }, [optimizationStats]);

  // updateRoutes function
  const updateRoutes = (routes, stats) => {
    setOptimizedRoutes(routes);
    setOptimizationStats(stats);
  };

  return (
    <RouteContext.Provider value={{ optimizedRoutes, optimizationStats, updateRoutes }}>
      {children}
    </RouteContext.Provider>
  );
}

export function useRoute() {
  const context = useContext(RouteContext);
  if (!context) {
    throw new Error('useRoute must be used within a RouteProvider');
  }
  return context;
}
