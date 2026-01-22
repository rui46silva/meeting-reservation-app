// lib/hooks.ts
"use client"

import useSWR from "swr"
import useSWRImmutable from "swr/immutable"
import type { Room, Reservation } from "@/lib/types"
import { apiFetch } from "@/lib/api"

export function useRooms() {
  return useSWRImmutable<Room[]>("/api/rooms", apiFetch, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    keepPreviousData: true,
  })
}

type ReservationsParams = {
  from: string
  to: string
  roomId?: string
  userId?: string
}

function toReservationsKey(params: ReservationsParams) {
  const sp = new URLSearchParams()
  sp.set("from", params.from)
  sp.set("to", params.to)
  if (params.roomId) sp.set("roomId", params.roomId)
  if (params.userId) sp.set("userId", params.userId)
  return `/api/reservations?${sp.toString()}`
}

export function useReservations(params: ReservationsParams | null) {
  const key = params ? toReservationsKey(params) : null

  return useSWR<Reservation[]>(key, apiFetch, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 15_000, 
    keepPreviousData: true,
  })
}
