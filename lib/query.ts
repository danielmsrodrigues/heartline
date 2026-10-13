import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export const queryKeys = {
  profile: (userId: string | undefined) => ["profile", userId] as const,
  healthData: (userId: string | undefined) => ["health-data", userId] as const,
  generated: (userId: string | undefined) => ["generated", userId] as const,
  regenerate: (userId: string | undefined) => ["regenerate", userId] as const,
};
