// app/api/users/me/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// GET /api/users/me?id=... ou /api/users/me?email=...
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    const email = searchParams.get("email")

    if (!id && !email) {
      return NextResponse.json(
        { error: "É necessário fornecer id ou email" },
        { status: 400 },
      )
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          id ? { id } : undefined,
          email ? { email } : undefined,
        ].filter(Boolean) as any,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Utilizador não encontrado" },
        { status: 404 },
      )
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error("[GET /api/users/me] error", error)
    return NextResponse.json(
      { error: "Erro ao obter utilizador atual" },
      { status: 500 },
    )
  }
}
