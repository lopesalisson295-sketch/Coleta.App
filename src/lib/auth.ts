import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "E-mail", type: "email", placeholder: "seu@email.com" },
        senha: { label: "Senha", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.senha) {
          throw new Error("E-mail e senha são obrigatórios.")
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user) {
          throw new Error("Usuário não encontrado.")
        }

        // Validação de E-mail Confirmado / Conta Ativa
        if (!user.emailConfirmado) {
          throw new Error("Por favor, ative sua conta pelo link enviado ao seu e-mail antes de fazer login.")
        }

        const isValid = await bcrypt.compare(credentials.senha, user.senha)

        if (!isValid) {
          throw new Error("Senha incorreta.")
        }

        return {
          id: user.id,
          name: user.nome,
          email: user.email,
          role: user.role,
          hasAvatar: !!user.avatar,
          avatarVersion: 0,
          onboardingCompleto: user.onboardingCompleto,
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.hasAvatar = user.hasAvatar
        token.avatarVersion = user.avatarVersion || 0
        token.onboardingCompleto = user.onboardingCompleto
      }
      if (trigger === "update" && session) {
        if (session.onboardingCompleto !== undefined) token.onboardingCompleto = session.onboardingCompleto
        if (session.avatar !== undefined) {
          token.hasAvatar = !!session.avatar
          token.avatarVersion = Date.now()
        }
        if (session.name !== undefined) token.name = session.name
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.hasAvatar = token.hasAvatar as boolean
        session.user.avatarVersion = token.avatarVersion as number
        session.user.onboardingCompleto = token.onboardingCompleto as boolean
      }
      return session
    }
  },
  pages: {
    signIn: "/auth/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "coletamax-super-secret-key-12345",
}
