// app/providers.tsx
"use client"

import type { ReactNode } from "react"
import { SessionProvider } from "next-auth/react"
import { SWRConfig } from "swr"
import { apiFetch } from "@/lib/api"

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <SWRConfig
        value={{
          fetcher: apiFetch,
          revalidateOnFocus: false,
          revalidateOnReconnect: false,
          dedupingInterval: 15_000,
          shouldRetryOnError: false,
        }}
      >
        {children}
      </SWRConfig>
    </SessionProvider>
  )
}
