/**
 * Templates de Email para o Sistema de Presença por QR Code
 * Todos os templates usam HTML responsivo
 */

export const emailTemplates = {
  /**
   * Template para notificação de presença registrada
   */
  attendanceConfirmation: (data: {
    studentName: string;
    eventName: string;
    credits: number;
    totalCredits: number;
    eventDate?: string;
    eventLocation?: string;
  }) => ({
    subject: "✅ Presença Registrada com Sucesso",
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">✅ Presença Confirmada</h1>
          <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Sua participação foi registrada com sucesso</p>
        </div>

        <!-- Content -->
        <div style="padding: 30px 20px; background: #f9f9f9; border-radius: 0 0 8px 8px;">
          <p style="margin: 0 0 20px 0; font-size: 16px;">Olá <strong>${data.studentName}</strong>,</p>
          
          <p style="margin: 0 0 20px 0; color: #555; line-height: 1.6;">
            Sua presença foi registrada com sucesso! Você acumulou créditos por participar do evento.
          </p>

          <!-- Event Details Card -->
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
            <div style="margin: 10px 0;">
              <p style="margin: 0; color: #999; font-size: 12px; text-transform: uppercase;">Evento</p>
              <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: bold; color: #333;">${data.eventName}</p>
            </div>

            ${data.eventDate ? `
            <div style="margin: 15px 0;">
              <p style="margin: 0; color: #999; font-size: 12px; text-transform: uppercase;">Data</p>
              <p style="margin: 5px 0 0 0; font-size: 14px; color: #555;">${data.eventDate}</p>
            </div>
            ` : ''}

            ${data.eventLocation ? `
            <div style="margin: 15px 0;">
              <p style="margin: 0; color: #999; font-size: 12px; text-transform: uppercase;">Local</p>
              <p style="margin: 5px 0 0 0; font-size: 14px; color: #555;">${data.eventLocation}</p>
            </div>
            ` : ''}

            <div style="margin: 15px 0; padding-top: 15px; border-top: 1px solid #eee;">
              <p style="margin: 0; color: #999; font-size: 12px; text-transform: uppercase;">Créditos Recebidos</p>
              <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #667eea;">${data.credits}</p>
            </div>

            <div style="margin: 15px 0;">
              <p style="margin: 0; color: #999; font-size: 12px; text-transform: uppercase;">Total de Créditos</p>
              <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold; color: #764ba2;">${data.totalCredits}</p>
            </div>
          </div>

          <p style="margin: 20px 0 0 0; color: #666; font-size: 14px; line-height: 1.6;">
            Você pode acompanhar seu histórico completo de créditos e participações no seu painel de controle.
          </p>

          <!-- Footer -->
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #999; font-size: 12px;">
            <p style="margin: 0;">Este é um email automático. Não responda a este email.</p>
            <p style="margin: 5px 0 0 0;">© 2026 Sistema de Presença por QR Code. Todos os direitos reservados.</p>
          </div>
        </div>
      </div>
    `,
  }),

  /**
   * Template para notificação de certificado disponível
   */
  certificateAvailable: (data: {
    studentName: string;
    eventName: string;
    certificateUrl: string;
    eventDate?: string;
  }) => ({
    subject: "🎓 Seu Certificado Está Disponível",
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px 20px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">🎓 Certificado Disponível</h1>
          <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Seu certificado de participação está pronto</p>
        </div>

        <!-- Content -->
        <div style="padding: 30px 20px; background: #f9f9f9; border-radius: 0 0 8px 8px;">
          <p style="margin: 0 0 20px 0; font-size: 16px;">Olá <strong>${data.studentName}</strong>,</p>
          
          <p style="margin: 0 0 20px 0; color: #555; line-height: 1.6;">
            Parabéns! Seu certificado de participação foi gerado e está pronto para download.
          </p>

          <!-- Certificate Details Card -->
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #f5576c; margin: 20px 0;">
            <div style="margin: 10px 0;">
              <p style="margin: 0; color: #999; font-size: 12px; text-transform: uppercase;">Evento</p>
              <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: bold; color: #333;">${data.eventName}</p>
            </div>

            ${data.eventDate ? `
            <div style="margin: 15px 0;">
              <p style="margin: 0; color: #999; font-size: 12px; text-transform: uppercase;">Data do Evento</p>
              <p style="margin: 5px 0 0 0; font-size: 14px; color: #555;">${data.eventDate}</p>
            </div>
            ` : ''}

            <div style="margin: 15px 0; padding-top: 15px; border-top: 1px solid #eee;">
              <p style="margin: 0; color: #999; font-size: 12px; text-transform: uppercase;">Status</p>
              <p style="margin: 5px 0 0 0; font-size: 14px;"><span style="background: #d4edda; color: #155724; padding: 4px 8px; border-radius: 4px; font-weight: bold;">✓ Pronto para Download</span></p>
            </div>
          </div>

          <!-- Download Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.certificateUrl}" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px; transition: transform 0.2s;">
              📥 Baixar Certificado
            </a>
          </div>

          <p style="margin: 20px 0 0 0; color: #666; font-size: 14px; line-height: 1.6; background: #f0f0f0; padding: 15px; border-radius: 6px;">
            <strong>💡 Dica:</strong> O certificado contém um código QR que pode ser validado para comprovar sua participação. Guarde-o com segurança.
          </p>

          <!-- Footer -->
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #999; font-size: 12px;">
            <p style="margin: 0;">Este é um email automático. Não responda a este email.</p>
            <p style="margin: 5px 0 0 0;">© 2026 Sistema de Presença por QR Code. Todos os direitos reservados.</p>
          </div>
        </div>
      </div>
    `,
  }),

  /**
   * Template para notificação de créditos baixos
   */
  lowCreditsWarning: (data: {
    studentName: string;
    currentCredits: number;
    minimumRequired: number;
    dashboardUrl: string;
  }) => ({
    subject: "⚠️ Aviso: Seus Créditos Estão Baixos",
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #ffa500 0%, #ff6b6b 100%); padding: 30px 20px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">⚠️ Créditos Baixos</h1>
          <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Você precisa acumular mais créditos</p>
        </div>

        <!-- Content -->
        <div style="padding: 30px 20px; background: #f9f9f9; border-radius: 0 0 8px 8px;">
          <p style="margin: 0 0 20px 0; font-size: 16px;">Olá <strong>${data.studentName}</strong>,</p>
          
          <p style="margin: 0 0 20px 0; color: #555; line-height: 1.6;">
            Notamos que seus créditos estão abaixo do mínimo recomendado. Recomendamos que você participe de mais eventos para acumular créditos.
          </p>

          <!-- Credits Card -->
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #ff6b6b; margin: 20px 0;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
              <div>
                <p style="margin: 0; color: #999; font-size: 12px; text-transform: uppercase;">Créditos Atuais</p>
                <p style="margin: 5px 0 0 0; font-size: 28px; font-weight: bold; color: #ff6b6b;">${data.currentCredits}</p>
              </div>
              <div>
                <p style="margin: 0; color: #999; font-size: 12px; text-transform: uppercase;">Mínimo Recomendado</p>
                <p style="margin: 5px 0 0 0; font-size: 28px; font-weight: bold; color: #ffa500;">${data.minimumRequired}</p>
              </div>
            </div>
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
              <p style="margin: 0; color: #999; font-size: 12px; text-transform: uppercase;">Diferença</p>
              <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: bold; color: #ff6b6b;">-${data.minimumRequired - data.currentCredits}</p>
            </div>
          </div>

          <!-- Action Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.dashboardUrl}" style="background: linear-gradient(135deg, #ffa500 0%, #ff6b6b 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">
              📅 Ver Eventos Disponíveis
            </a>
          </div>

          <p style="margin: 20px 0 0 0; color: #666; font-size: 14px; line-height: 1.6; background: #f0f0f0; padding: 15px; border-radius: 6px;">
            <strong>💡 Dica:</strong> Participe de eventos para acumular créditos. Cada evento tem uma quantidade específica de créditos que você receberá ao registrar sua presença.
          </p>

          <!-- Footer -->
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #999; font-size: 12px;">
            <p style="margin: 0;">Este é um email automático. Não responda a este email.</p>
            <p style="margin: 5px 0 0 0;">© 2026 Sistema de Presença por QR Code. Todos os direitos reservados.</p>
          </div>
        </div>
      </div>
    `,
  }),

  /**
   * Template genérico para notificações customizadas
   */
  generic: (data: {
    title: string;
    studentName: string;
    message: string;
    actionUrl?: string;
    actionText?: string;
    highlightColor?: string;
  }) => ({
    subject: data.title,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, ${data.highlightColor || "#667eea"} 0%, ${data.highlightColor || "#764ba2"} 100%); padding: 30px 20px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">${data.title}</h1>
        </div>

        <!-- Content -->
        <div style="padding: 30px 20px; background: #f9f9f9; border-radius: 0 0 8px 8px;">
          <p style="margin: 0 0 20px 0; font-size: 16px;">Olá <strong>${data.studentName}</strong>,</p>
          
          <p style="margin: 0 0 20px 0; color: #555; line-height: 1.6;">
            ${data.message}
          </p>

          ${data.actionUrl && data.actionText ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.actionUrl}" style="background: linear-gradient(135deg, ${data.highlightColor || "#667eea"} 0%, ${data.highlightColor || "#764ba2"} 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">
              ${data.actionText}
            </a>
          </div>
          ` : ''}

          <!-- Footer -->
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #999; font-size: 12px;">
            <p style="margin: 0;">Este é um email automático. Não responda a este email.</p>
            <p style="margin: 5px 0 0 0;">© 2026 Sistema de Presença por QR Code. Todos os direitos reservados.</p>
          </div>
        </div>
      </div>
    `,
  }),
};

export default emailTemplates;
