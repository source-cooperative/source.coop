'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import type { Product_v2, ProductObject } from '@/types';

interface ObjectBrowserContextType {
  currentPath: string[];
  selectedObject: ProductObject | null;
  selectedDataItem: string | null;
  setCurrentPath: (path: string[]) => void;
  setSelectedObject: (object: ProductObject | null) => void;
  setSelectedDataItem: (item: string | null) => void;
  navigateTo: (path: string[]) => void;
}

const ObjectBrowserContext = createContext<ObjectBrowserContextType | null>(null);

export function ObjectBrowserProvider({ 
  children, 
  initialPath = '', 
  initialObject 
}: { 
  children: React.ReactNode;
  product: Product_v2;
  initialPath?: string;
  initialObject?: ProductObject;
}) {
  const [currentPath, setCurrentPath] = useState<string[]>(
    initialPath ? initialPath.split('/').filter(Boolean) : []
  );
  const [selectedObject, setSelectedObject] = useState<ProductObject | null>(initialObject || null);
  const [selectedDataItem, setSelectedDataItem] = useState<string | null>(null);

  const navigateTo = useCallback((path: string[]) => {
    setCurrentPath(path);
    setSelectedObject(null);
    setSelectedDataItem(null);
  }, []);

  return (
    <ObjectBrowserContext.Provider value={{
      currentPath,
      selectedObject,
      selectedDataItem,
      setCurrentPath,
      setSelectedObject,
      setSelectedDataItem,
      navigateTo
    }}>
      {children}
    </ObjectBrowserContext.Provider>
  );
}

export function useObjectBrowser() {
  const context = useContext(ObjectBrowserContext);
  if (!context) {
    throw new Error('useObjectBrowser must be used within an ObjectBrowserProvider');
  }
  return context;
} 