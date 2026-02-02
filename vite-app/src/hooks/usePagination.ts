import { useState, useMemo, useCallback } from "react";

interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
}

interface UsePaginationResult<T> {
  // Paginated data
  paginatedItems: T[];
  
  // Pagination state
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  
  // Navigation
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setPageSize: (size: number) => void;
  
  // Helpers
  hasNextPage: boolean;
  hasPrevPage: boolean;
  startIndex: number;
  endIndex: number;
}

/**
 * Hook for paginating an array of items
 * 
 * @example
 * const { paginatedItems, currentPage, totalPages, goToPage, nextPage, prevPage } = usePagination(products, { initialPageSize: 20 });
 */
export function usePagination<T>(
  items: T[],
  options: UsePaginationOptions = {}
): UsePaginationResult<T> {
  const { initialPage = 1, initialPageSize = 20 } = options;
  
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  
  // Ensure current page is valid when items change
  const validCurrentPage = Math.min(currentPage, totalPages);
  if (validCurrentPage !== currentPage) {
    setCurrentPage(validCurrentPage);
  }
  
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  
  const paginatedItems = useMemo(() => {
    return items.slice(startIndex, endIndex);
  }, [items, startIndex, endIndex]);
  
  const goToPage = useCallback((page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  }, [totalPages]);
  
  const nextPage = useCallback(() => {
    if (validCurrentPage < totalPages) {
      setCurrentPage(validCurrentPage + 1);
    }
  }, [validCurrentPage, totalPages]);
  
  const prevPage = useCallback(() => {
    if (validCurrentPage > 1) {
      setCurrentPage(validCurrentPage - 1);
    }
  }, [validCurrentPage]);
  
  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setCurrentPage(1); // Reset to first page when changing page size
  }, []);
  
  return {
    paginatedItems,
    currentPage: validCurrentPage,
    pageSize,
    totalItems,
    totalPages,
    goToPage,
    nextPage,
    prevPage,
    setPageSize,
    hasNextPage: validCurrentPage < totalPages,
    hasPrevPage: validCurrentPage > 1,
    startIndex: startIndex + 1, // 1-indexed for display
    endIndex,
  };
}
