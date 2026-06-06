import nodemailer from "nodemailer";
import { ENV } from "../core/env.js";

// Configuração do transporter do Nodemailer com Gmail
let transporter: nodemailer.Transporter | null = null;

/**
 * Inicializa o transporter do Nodemailer com credenciais do Gmail
 */
function getTransporter(): nodemailer.Transporter {
  if (transporter) {
    return transporter;
  }

  const emailUser = ENV.emailUser;
  const emailPassword = ENV.emailPassword;

  if (!emailUser || !emailPassword) {
    throw new Error(
      "EMAIL_USER e EMAIL_PASSWORD não configurados no .env"
    );
  }

  transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,  // TLS em vez de SSL
    auth: {
      user: emailUser,
      pass: emailPassword,
    },
  });


  return transporter;
}

/**
 * Envia um email genérico
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<boolean> {
  try {
    const transporter = getTransporter();
    const emailFrom = ENV.emailFrom || ENV.emailUser;

    const mailOptions = {
      from: emailFrom,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ""), // Remove tags HTML para versão texto
    };

    const info = await transporter.sendMail(mailOptions);

    console.log(`[EMAIL] Email enviado com sucesso para ${to}`);
    console.log(`[EMAIL] Message ID: ${info.messageId}`);

    return true;
  } catch (error) {
    console.error(`[EMAIL] Erro ao enviar email para ${to}:`, error);
    return false;
  }
}

/**
 * Envia notificação de presença registrada
 */
export async function sendAttendanceNotification(
  studentEmail: string,
  studentName: string,
  eventName: string,
  credits: number,
  totalCredits: number
): Promise<boolean> {
  const subject = "✅ Presença Registrada com Sucesso";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px 8px 0 0; color: white;">
        <h2 style="margin: 0;">Presença Registrada</h2>
      </div>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 0 0 8px 8px;">
        <p>Olá <strong>${studentName}</strong>,</p>
        
        <p>Sua presença foi registrada com sucesso no evento:</p>
        
        <div style="background: white; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0;">
          <p style="margin: 5px 0;"><strong>Evento:</strong> ${eventName}</p>
          <p style="margin: 5px 0;"><strong>Créditos Recebidos:</strong> <span style="color: #667eea; font-weight: bold;">${credits}</span></p>
          <p style="margin: 5px 0;"><strong>Total de Créditos:</strong> <span style="color: #764ba2; font-weight: bold;">${totalCredits}</span></p>
        </div>
        
        <p>Você pode acompanhar seu histórico de créditos no seu painel de controle.</p>
        
        <p style="color: #666; font-size: 12px; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px;">
          Este é um email automático. Não responda a este email.
        </p>
      </div>
    </div>
  `;

  return sendEmail(studentEmail, subject, html);
}

/**
 * Envia notificação de certificado disponível
 */
export async function sendCertificateNotification(
  studentEmail: string,
  studentName: string,
  eventName: string,
  certificateUrl: string
): Promise<boolean> {
  const subject = "🎓 Seu Certificado Está Disponível";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 8px 8px 0 0; color: white;">
        <h2 style="margin: 0;">Certificado Disponível</h2>
      </div>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 0 0 8px 8px;">
        <p>Olá <strong>${studentName}</strong>,</p>
        
        <p>Seu certificado de participação está pronto para download!</p>
        
        <div style="background: white; padding: 15px; border-left: 4px solid #f5576c; margin: 15px 0;">
          <p style="margin: 5px 0;"><strong>Evento:</strong> ${eventName}</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #f5576c; font-weight: bold;">✓ Pronto</span></p>
        </div>
        
        <p style="text-align: center; margin: 20px 0;">
          <a href="${certificateUrl}" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Baixar Certificado
          </a>
        </p>
        
        <p>O certificado contém um código QR que pode ser validado para comprovar sua participação.</p>
        
        <p style="color: #666; font-size: 12px; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px;">
          Este é um email automático. Não responda a este email.
        </p>
      </div>
    </div>
  `;

  return sendEmail(studentEmail, subject, html);
}

/**
 * Envia notificação de créditos baixos
 */
export async function sendLowCreditsNotification(
  studentEmail: string,
  studentName: string,
  currentCredits: number,
  minimumRequired: number
): Promise<boolean> {
  const subject = "⚠️ Aviso: Seus Créditos Estão Baixos";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #ffa500 0%, #ff6b6b 100%); padding: 20px; border-radius: 8px 8px 0 0; color: white;">
        <h2 style="margin: 0;">Aviso de Créditos Baixos</h2>
      </div>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 0 0 8px 8px;">
        <p>Olá <strong>${studentName}</strong>,</p>
        
        <p>Notamos que seus créditos estão abaixo do mínimo recomendado.</p>
        
        <div style="background: white; padding: 15px; border-left: 4px solid #ff6b6b; margin: 15px 0;">
          <p style="margin: 5px 0;"><strong>Créditos Atuais:</strong> <span style="color: #ff6b6b; font-weight: bold;">${currentCredits}</span></p>
          <p style="margin: 5px 0;"><strong>Mínimo Recomendado:</strong> <span style="color: #ffa500; font-weight: bold;">${minimumRequired}</span></p>
          <p style="margin: 5px 0;"><strong>Diferença:</strong> <span style="color: #ff6b6b; font-weight: bold;">-${minimumRequired - currentCredits}</span></p>
        </div>
        
        <p>Recomendamos que você participe de mais eventos para acumular créditos.</p>
        
        <p style="text-align: center; margin: 20px 0;">
          <a href="https://seu-dominio.com/dashboard" style="background: linear-gradient(135deg, #ffa500 0%, #ff6b6b 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Ver Eventos Disponíveis
          </a>
        </p>
        
        <p style="color: #666; font-size: 12px; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px;">
          Este é um email automático. Não responda a este email.
        </p>
      </div>
    </div>
  `;

  return sendEmail(studentEmail, subject, html);
}

/**
 * Envia notificação genérica
 */
export async function sendGenericNotification(
  studentEmail: string,
  studentName: string,
  title: string,
  message: string,
  actionUrl?: string,
  actionText?: string
): Promise<boolean> {
  const subject = title;

  let actionButton = "";
  if (actionUrl && actionText) {
    actionButton = `
      <p style="text-align: center; margin: 20px 0;">
        <a href="${actionUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
          ${actionText}
        </a>
      </p>
    `;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px 8px 0 0; color: white;">
        <h2 style="margin: 0;">${title}</h2>
      </div>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 0 0 8px 8px;">
        <p>Olá <strong>${studentName}</strong>,</p>
        
        <p>${message}</p>
        
        ${actionButton}
        
        <p style="color: #666; font-size: 12px; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px;">
          Este é um email automático. Não responda a este email.
        </p>
      </div>
    </div>
  `;

  return sendEmail(studentEmail, subject, html);
}

/**
 * Testa a conexão com o servidor de email
 */
export async function testEmailConnection(): Promise<boolean> {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    console.log("[EMAIL] ✅ Conexão com servidor de email verificada com sucesso");
    return true;
  } catch (error) {
    console.error("[EMAIL] ❌ Erro ao verificar conexão com servidor de email:", error);
    return false;
  }
}

/**
 * Envia notificação ao proprietário - QR Code Inválido
 */
export async function notifyOwnerInvalidQR(
  studentName: string,
  eventName: string,
  attemptTime: Date
): Promise<boolean> {
  const ownerEmail = process.env.ADMIN_EMAILS || ENV.emailUser;
  
  const subject = "🚨 Tentativa de QR Code Inválido Detectada";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%); padding: 20px; border-radius: 8px 8px 0 0; color: white;">
        <h2 style="margin: 0;">⚠️ Alerta de Segurança</h2>
      </div>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 0 0 8px 8px;">
        <p>Uma tentativa de registrar presença com QR Code inválido foi detectada.</p>
        
        <div style="background: white; padding: 15px; border-left: 4px solid #ff6b6b; margin: 15px 0;">
          <p style="margin: 5px 0;"><strong>Aluno:</strong> ${studentName}</p>
          <p style="margin: 5px 0;"><strong>Evento:</strong> ${eventName}</p>
          <p style="margin: 5px 0;"><strong>Horário:</strong> ${attemptTime.toLocaleString("pt-BR")}</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #ff6b6b; font-weight: bold;">❌ Bloqueado</span></p>
        </div>
        
        <p style="color: #666; font-size: 12px; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px;">
          Este é um email automático. Não responda a este email.
        </p>
      </div>
    </div>
  `;

  return sendEmail(ownerEmail, subject, html);
}

/**
 * Envia notificação ao proprietário - Falha de Certificado
 */
export async function notifyOwnerCertificateFailure(
  studentName: string,
  eventName: string,
  errorMessage: string
): Promise<boolean> {
  const ownerEmail = process.env.ADMIN_EMAILS || ENV.emailUser;
  
  const subject = "🔴 Erro: Falha na Geração de Certificado";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%); padding: 20px; border-radius: 8px 8px 0 0; color: white;">
        <h2 style="margin: 0;">🔴 Erro Crítico</h2>
      </div>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 0 0 8px 8px;">
        <p>Falha ao gerar certificado para um aluno.</p>
        
        <div style="background: white; padding: 15px; border-left: 4px solid #ff6b6b; margin: 15px 0;">
          <p style="margin: 5px 0;"><strong>Aluno:</strong> ${studentName}</p>
          <p style="margin: 5px 0;"><strong>Evento:</strong> ${eventName}</p>
          <p style="margin: 5px 0;"><strong>Erro:</strong> <span style="color: #ff6b6b;">${errorMessage}</span></p>
        </div>
        
        <p style="color: #666; font-size: 12px; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px;">
          Este é um email automático. Não responda a este email.
        </p>
      </div>
    </div>
  `;

  return sendEmail(ownerEmail, subject, html);
}

/**
 * Envia notificação ao proprietário - Evento com Baixa Participação
 */
export async function notifyOwnerLowParticipation(
  eventName: string,
  participantCount: number,
  minimumExpected: number = 5
): Promise<boolean> {
  const ownerEmail = process.env.ADMIN_EMAILS || ENV.emailUser;
  
  const subject = "⚠️ Evento com Baixa Participação";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #ffa500 0%, #ff8c00 100%); padding: 20px; border-radius: 8px 8px 0 0; color: white;">
        <h2 style="margin: 0;">⚠️ Alerta Administrativo</h2>
      </div>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 0 0 8px 8px;">
        <p>Um evento apresenta participação abaixo do esperado.</p>
        
        <div style="background: white; padding: 15px; border-left: 4px solid #ffa500; margin: 15px 0;">
          <p style="margin: 5px 0;"><strong>Evento:</strong> ${eventName}</p>
          <p style="margin: 5px 0;"><strong>Participantes:</strong> <span style="color: #ffa500; font-weight: bold;">${participantCount}</span></p>
          <p style="margin: 5px 0;"><strong>Esperado:</strong> <span style="color: #ff8c00; font-weight: bold;">≥ ${minimumExpected}</span></p>
        </div>
        
        <p>Considere revisar a divulgação do evento ou ajustar a data/horário.</p>
        
        <p style="color: #666; font-size: 12px; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px;">
          Este é um email automático. Não responda a este email.
        </p>
      </div>
    </div>
  `;

  return sendEmail(ownerEmail, subject, html);
}

/**
 * Envia resumo diário ao proprietário
 */
export async function sendDailySummary(
  totalAttendances: number,
  totalCertificates: number,
  totalEvents: number,
  topStudents: Array<{ name: string; participations: number }>
): Promise<boolean> {
  const ownerEmail = process.env.ADMIN_EMAILS || ENV.emailUser;
  
  const subject = "📊 Resumo Diário - Sistema de Presença";
  
  const topStudentsHtml = topStudents
    .slice(0, 5)
    .map(
      (s, i) =>
        `<tr><td style="padding: 8px; border-bottom: 1px solid #ddd;">${i + 1}</td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${s.name}</td><td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${s.participations}</td></tr>`
    )
    .join("");

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px 8px 0 0; color: white;">
        <h2 style="margin: 0;">📊 Resumo Diário</h2>
        <p style="margin: 5px 0; font-size: 14px;">${new Date().toLocaleDateString("pt-BR")}</p>
      </div>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 0 0 8px 8px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 20px;">
          <div style="background: white; padding: 15px; border-radius: 5px; text-align: center; border-top: 4px solid #667eea;">
            <p style="margin: 0; font-size: 12px; color: #666;">Presenças</p>
            <p style="margin: 5px 0; font-size: 24px; font-weight: bold; color: #667eea;">${totalAttendances}</p>
          </div>
          
          <div style="background: white; padding: 15px; border-radius: 5px; text-align: center; border-top: 4px solid #764ba2;">
            <p style="margin: 0; font-size: 12px; color: #666;">Certificados</p>
            <p style="margin: 5px 0; font-size: 24px; font-weight: bold; color: #764ba2;">${totalCertificates}</p>
          </div>
          
          <div style="background: white; padding: 15px; border-radius: 5px; text-align: center; border-top: 4px solid #667eea;">
            <p style="margin: 0; font-size: 12px; color: #666;">Eventos</p>
            <p style="margin: 5px 0; font-size: 24px; font-weight: bold; color: #667eea;">${totalEvents}</p>
          </div>
        </div>
        
        <div style="background: white; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
          <h3 style="margin: 0 0 10px 0; color: #667eea;">🏆 Alunos Mais Ativos</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f5f5f5;">
                <th style="padding: 8px; text-align: left; font-weight: bold;">#</th>
                <th style="padding: 8px; text-align: left; font-weight: bold;">Aluno</th>
                <th style="padding: 8px; text-align: center; font-weight: bold;">Participações</th>
              </tr>
            </thead>
            <tbody>
              ${topStudentsHtml}
            </tbody>
          </table>
        </div>
        
        <p style="color: #666; font-size: 12px; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px;">
          Este é um email automático. Não responda a este email.
        </p>
      </div>
    </div>
  `;

  return sendEmail(ownerEmail, subject, html);
}

export default {
  sendEmail,
  sendAttendanceNotification,
  sendCertificateNotification,
  sendLowCreditsNotification,
  sendGenericNotification,
  testEmailConnection,
  notifyOwnerInvalidQR,
  notifyOwnerCertificateFailure,
  notifyOwnerLowParticipation,
  sendDailySummary,
};
