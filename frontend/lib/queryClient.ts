import { QueryClient } from '@tanstack/react-query';

// Create a client with optimized defaults for mobile
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Keep unused data in cache for 10 minutes
      gcTime: 10 * 60 * 1000, // Previously cacheTime
      // Retry failed requests 1 time
      retry: 1,
      // Refetch on window focus (useful for web, less for mobile)
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect automatically (we'll handle it manually)
      refetchOnReconnect: false,
      // Don't refetch on mount if data is fresh
      refetchOnMount: true,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
    },
  },
});

