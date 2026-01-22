// lib/api.ts
export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    })
  
    const text = await res.text()
    const data = text ? JSON.parse(text) : null
  
    if (!res.ok) {
      const msg = data?.error || data?.message || `Request failed: ${res.status}`
      throw new Error(msg)
    }
  
    return data as T
  }
  