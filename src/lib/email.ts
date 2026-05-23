import nodemailer from "nodemailer"

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Utilitário de disparo de e-mails usando SMTP seguro (como Gmail).
 * Se as credenciais do SMTP não forem fornecidas, opera em modo de simulação (logs).
 */
export async function enviarEmail({ to, subject, html }: SendEmailParams): Promise<boolean> {
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = parseInt(process.env.SMTP_PORT || "465");
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    console.log("\n==================================================");
    console.log("⚡ [ColetaMax] MODO SIMULAÇÃO DE E-MAIL ATIVADO ⚡");
    console.log(`Para: ${to}`);
    console.log(`Assunto: ${subject}`);
    console.log("--------------------------------------------------");
    console.log("CONTEÚDO DO E-MAIL:");
    // Limpa tags HTML básicas para o log ficar legível
    const plainText = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    console.log(plainText.slice(0, 500) + "...");
    console.log("==================================================\n");
    return true;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true para SSL (porta 465), false para TLS (porta 587)
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const info = await transporter.sendMail({
      from: `"ColetaMax" <${smtpUser}>`,
      to,
      subject,
      html,
    });

    console.log(`[ColetaMax] E-mail enviado com sucesso para ${to}. ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("[ColetaMax] Falha ao enviar e-mail via SMTP:", error);
    return false;
  }
}

/**
 * Gera o template de e-mail HTML premium de ativação de conta.
 */
export function obterTemplateVerificacao(nome: string, linkAtivacao: string, cargo: string): string {
  const cargoTraduzido = cargo === "ADMIN" ? "Administrador" : cargo === "MOTORISTA" ? "Motorista" : "Ajudante Operacional";
  
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Ative sua Conta - ColetaMax</title>
      <style>
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #f8fafc;
          margin: 0;
          padding: 0;
          -webkit-font-smoothing: antialiased;
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
          background: linear-gradient(135deg, #00a884 0%, #008769 100%);
          padding: 40px 30px;
          text-align: center;
          color: #ffffff;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 300;
          letter-spacing: -0.5px;
        }
        .header p {
          margin: 10px 0 0 0;
          font-size: 14px;
          opacity: 0.9;
        }
        .content {
          padding: 40px 30px;
          color: #334155;
          line-height: 1.6;
        }
        .welcome-title {
          font-size: 20px;
          font-weight: 700;
          color: #0f172a;
          margin-top: 0;
          margin-bottom: 20px;
        }
        .badge {
          display: inline-block;
          background-color: #f0fdf4;
          color: #16a34a;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 9999px;
          border: 1px solid #bbf7d0;
          text-transform: uppercase;
          margin-bottom: 20px;
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
          transition: all 0.2s ease-in-out;
        }
        .cta-button:hover {
          background: #008769;
          transform: translateY(-2px);
        }
        .info-card {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          margin-top: 25px;
        }
        .info-title {
          font-size: 13px;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 0;
          margin-bottom: 10px;
        }
        .info-item {
          font-size: 13px;
          margin-bottom: 8px;
        }
        .info-item:last-child {
          margin-bottom: 0;
        }
        .footer {
          background-color: #f8fafc;
          border-top: 1px solid #e2e8f0;
          padding: 25px 30px;
          text-align: center;
          font-size: 12px;
          color: #64748b;
        }
        .footer a {
          color: #00a884;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>ColetaMax</h1>
          <p>Plataforma Inteligente de Logística e Coletas</p>
        </div>
        <div class="content">
          <div class="badge">E-mail de Confirmação</div>
          <h2 class="welcome-title">Olá, ${nome}!</h2>
          <p>Obrigado por se cadastrar no ColetaMax. Para garantir a segurança dos dados operacionais e habilitar o acesso completo ao seu painel, precisamos que confirme o seu endereço de e-mail.</p>
          
          <div class="cta-container">
            <a href="${linkAtivacao}" class="cta-button">Confirmar e Ativar Minha Conta</a>
          </div>

          <p style="font-size: 13px; color: #64748b;">Se o botão acima não funcionar, copie e cole o link abaixo em seu navegador:<br>
          <a href="${linkAtivacao}" style="color: #00a884; word-break: break-all;">${linkAtivacao}</a></p>

          <div class="info-card">
            <h3 class="info-title">Detalhes da sua Credencial</h3>
            <div class="info-item"><strong>Cargo / Função:</strong> ${cargoTraduzido}</div>
            <div class="info-item"><strong>Status:</strong> Aguardando Confirmação</div>
          </div>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ColetaMax. Todos os direitos reservados.</p>
          <p>Este é um e-mail operacional. Não responda a esta mensagem.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
