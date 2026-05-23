import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { enviarEmail, obterTemplateVerificacao } from "@/lib/email"

export async function POST(req: Request) {
  try {
    const { nome, email, senha, role } = await req.json()

    if (!nome || !email || !senha) {
      return NextResponse.json({ message: "Dados incompletos" }, { status: 400 })
    }

    const userExists = await prisma.user.findUnique({
      where: { email }
    })

    if (userExists) {
      return NextResponse.json({ message: "E-mail já cadastrado" }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(senha, 10)
    
    // Geração do token de confirmação seguro
    const token = crypto.randomUUID()

    const user = await prisma.user.create({
      data: {
        nome,
        email,
        senha: hashedPassword,
        role: role, // O frontend já envia ADMIN, MOTORISTA ou AJUDANTE
        onboardingCompleto: false, // Inicia como falso para o onboarding real
        emailConfirmado: false, // Bloqueado até confirmar e-mail
        tokenConfirmacao: token,
      }
    })

    // Construção do link dinâmico de verificação (funciona local e em produção na Vercel)
    const host = req.headers.get("host") || "localhost:3000"
    const protocol = host.includes("localhost") ? "http" : "https"
    const linkAtivacao = `${protocol}://${host}/api/auth/verify?token=${token}`

    // Dispara o e-mail de ativação HTML Premium
    const htmlEmail = obterTemplateVerificacao(nome, linkAtivacao, role)
    await enviarEmail({
      to: email,
      subject: "Ative sua conta no ColetaMax 🚚",
      html: htmlEmail
    })

    return NextResponse.json({ 
      message: "Usuário criado com sucesso! Por favor, verifique sua caixa de entrada para ativar a conta.", 
      user: { id: user.id, email: user.email } 
    }, { status: 201 })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ message: "Erro interno" }, { status: 500 })
  }
}
