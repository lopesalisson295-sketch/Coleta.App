import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { enviarEmail } from "@/lib/email"

/**
 * Endpoint de verificação de token de e-mail.
 * Quando o link de confirmação do e-mail é clicado, este endpoint é acessado.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json({ error: "Token de verificação inválido ou ausente." }, { status: 400 })
    }

    // Busca o usuário associado a este token
    const user = await prisma.user.findFirst({
      where: { tokenConfirmacao: token }
    })

    if (!user) {
      // Se não achar o token, redireciona para a página de erro ou login com mensagem
      const host = req.headers.get("host") || "localhost:3000"
      const protocol = host.includes("localhost") ? "http" : "https"
      return NextResponse.redirect(`${protocol}://${host}/auth/login?error=token_invalido`)
    }

    // Ativa a conta do usuário e limpa o token de confirmação
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailConfirmado: true,
        tokenConfirmacao: null
      }
    })

    // Construção do e-mail de Boas-Vindas Operacional (HTML Premium)
    const host = req.headers.get("host") || "localhost:3000"
    const protocol = host.includes("localhost") ? "http" : "https"
    const linkLogin = `${protocol}://${host}/auth/login`
    const cargoTraduzido = user.role === "ADMIN" ? "Administrador" : user.role === "MOTORISTA" ? "Motorista" : "Ajudante Operacional"

    const htmlBoasVindas = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Conta Ativada - ColetaMax</title>
        <style>
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f8fafc;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 20px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
            overflow: hidden;
            border: 1px solid #e2e8f0;
          }
          .header {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            padding: 40px 30px;
            text-align: center;
            color: #ffffff;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            color: #00a884;
            font-weight: 300;
          }
          .content {
            padding: 40px 30px;
            color: #334155;
            line-height: 1.6;
          }
          .title {
            font-size: 20px;
            font-weight: 700;
            color: #0f172a;
            margin-top: 0;
          }
          .step-list {
            margin: 25px 0;
            padding-left: 20px;
          }
          .step-item {
            margin-bottom: 15px;
            font-size: 14px;
          }
          .step-item strong {
            color: #0f172a;
          }
          .cta-container {
            text-align: center;
            margin: 35px 0;
          }
          .cta-button {
            display: inline-block;
            background: #00a884;
            color: #ffffff !important;
            text-decoration: none;
            font-weight: 600;
            font-size: 14px;
            padding: 14px 32px;
            border-radius: 12px;
            box-shadow: 0 4px 14px 0 rgba(0, 168, 132, 0.3);
          }
          .footer {
            background-color: #f8fafc;
            border-top: 1px solid #e2e8f0;
            padding: 25px 30px;
            text-align: center;
            font-size: 12px;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>ColetaMax</h1>
            <p style="margin: 5px 0 0 0; font-size: 13px; color: #94a3b8;">Sua jornada logística começa agora!</p>
          </div>
          <div class="content">
            <h2 class="title">🎉 Conta Ativada com Sucesso!</h2>
            <p>Olá, <strong>${user.nome}</strong>. Seu e-mail foi verificado e sua credencial como <strong>${cargoTraduzido}</strong> está oficialmente ativa em nosso sistema.</p>
            
            <p>Para ajudá-lo a começar, preparamos os próximos passos do seu onboarding:</p>
            
            <ul class="step-list">
              <li class="step-item"><strong>1. Primeiro Login:</strong> Acesse a plataforma e entre com suas credenciais cadastradas.</li>
              <li class="step-item"><strong>2. Configuração de Perfil:</strong> Complete as informações de perfil e adicione sua foto de avatar operacional.</li>
              <li class="step-item"><strong>3. Vinculação de Veículo:</strong> Se for Motorista, vincule seu veículo ativo para receber rotas automáticas.</li>
              <li class="step-item"><strong>4. Painel de Coletas:</strong> Acompanhe os disparos em tempo real de mensagens de status via WhatsApp integrado.</li>
            </ul>

            <div class="cta-container">
              <a href="${linkLogin}" class="cta-button">Fazer Login no ColetaMax</a>
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ColetaMax. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `

    // Envia o e-mail de boas-vindas operacional
    await enviarEmail({
      to: user.email,
      subject: "Bem-vindo ao ColetaMax! 🚚 Sua conta está ativa",
      html: htmlBoasVindas
    })

    // Redireciona o usuário para a página de sucesso premium no frontend
    return NextResponse.redirect(`${protocol}://${host}/auth/verify-success`)
  } catch (error) {
    console.error("Verification error:", error)
    return NextResponse.json({ error: "Erro interno no servidor de verificação." }, { status: 500 })
  }
}
