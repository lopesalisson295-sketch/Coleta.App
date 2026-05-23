// eslint-disable-next-line @typescript-eslint/no-unused-vars
import NextAuth, { DefaultSession, DefaultUser } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      avatar: string | null
      onboardingCompleto: boolean
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    role: string
    avatar: string | null
    onboardingCompleto: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
    avatar: string | null
    onboardingCompleto: boolean
  }
}
