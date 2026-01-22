// lib/auth-options.ts
import type { NextAuthOptions, DefaultSession } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import type { JWT } from "next-auth/jwt"
import type { UserRole } from "@prisma/client"
import { prisma } from "@/lib/db"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: UserRole
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    role: UserRole
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    role?: UserRole
  }
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],

  callbacks: {
    async signIn({ user }) {
      const email = user.email ?? ""
      const allowedDomains = ["legendary.pt", "silver-lining.pt"]

      const domain = email.split("@")[1]
      if (!allowedDomains.includes(domain)) {
        console.warn("[NextAuth] Email domain not allowed:", email)
        return false
      }

      try {
        let dbUser = await prisma.user.findUnique({
          where: { email },
        })

        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              id: crypto.randomUUID(),
              email,
              name: user.name ?? email,
              role: "USER",
            },
          })
        }
      } catch (err) {
        console.error("[NextAuth signIn] error creating/finding user:", err)
        return false
      }

      return true
    },

    async jwt({ token, user }) {
      if (user) {
        const email = user.email ?? ""
        try {
          let dbUser = await prisma.user.findUnique({
            where: { email },
          })

          if (!dbUser) {
            dbUser = await prisma.user.create({
              data: {
                id: crypto.randomUUID(),
                email,
                name: user.name ?? email,
                role: "USER",
              },
            })
          }

          token.id = dbUser.id
          token.role = dbUser.role
        } catch (err) {
          console.error("[NextAuth jwt] error finding/creating user:", err)
        }
      } else if (token.email && !token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email },
          })

          if (dbUser) {
            token.id = dbUser.id
            token.role = dbUser.role
          }
        } catch (err) {
          console.error("[NextAuth jwt] error loading user from token.email:", err)
        }
      }

      return token
    },

    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string
        ;(session.user as any).role = (token.role as UserRole) ?? "USER"
      }
      return session
    },
  },

  pages: {
    // signIn: "/auth/signin",
  },
}
