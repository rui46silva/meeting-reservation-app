"use client"

import { useEffect, useState } from "react"
import type { Room } from "@/lib/types"
import { toast } from "sonner"

let roomsCache: Room[] | null = null
let roomsError: Error | null = null
let roomsPromise: Promise<Room[]> | null = null

async function fetchRoomsOnce(): Promise<Room[]> {
  if (roomsCache) return roomsCache

  if (roomsPromise) return roomsPromise

  roomsPromise = (async () => {
    const res = await fetch("/api/rooms")
    if (!res.ok) {
      throw new Error("Falha ao carregar salas")
    }
    const data = (await res.json()) as Room[]
    roomsCache = data
    roomsError = null
    return data
  })()

  try {
    return await roomsPromise
  } catch (err) {
    roomsCache = null
    roomsError = err as Error
    throw err
  } finally {
    roomsPromise = null
  }
}

export function clearRoomsCache() {
  roomsCache = null
  roomsError = null
  roomsPromise = null
}

interface UseRoomsResult {
  rooms: Room[]
  loading: boolean
  error: Error | null
  refetch: () => void
}

export function useRooms(): UseRoomsResult {
  const [rooms, setRooms] = useState<Room[]>(roomsCache ?? [])
  const [loading, setLoading] = useState<boolean>(!roomsCache && !roomsError)
  const [error, setError] = useState<Error | null>(roomsError)

  useEffect(() => {
    if (roomsCache || roomsError) {
      setRooms(roomsCache ?? [])
      setError(roomsError)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    fetchRoomsOnce()
      .then((data) => {
        if (cancelled) return
        setRooms(data)
        setError(null)
      })
      .catch((err) => {
        if (cancelled) return
        console.error(err)
        setError(err as Error)
        toast.error("Erro ao carregar salas")
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const refetch = () => {
    clearRoomsCache()
    setLoading(true)
    fetchRoomsOnce()
      .then((data) => {
        setRooms(data)
        setError(null)
      })
      .catch((err) => {
        console.error(err)
        setError(err as Error)
        toast.error("Erro ao recarregar salas")
      })
      .finally(() => setLoading(false))
  }

  return { rooms, loading, error, refetch }
}
