import * as studentRepo from "../repositories/studentRepository.js";
import * as notificationRepo from "../repositories/notificationRepository.js";
import * as eventRepo from "../repositories/eventRepository.js";
import * as attendanceRepo from "../repositories/attendanceRepository.js";
import * as certificateRepo from "../repositories/certificateRepository.js";
import * as emailService from "./emailService.js";
import { emailTemplates } from "./emailTemplates.js";
import * as analysisService from "./analysisService.js";

class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Enviar notificação por email para aluno quando recebe créditos
 */
/**
 * Enviar notificação por email para aluno quando recebe créditos
 */
export async function notifyStudentCreditsReceived(
  studentId: number,
  eventName: string,
  credits: number,
  totalCredits: number
) {
  try {
    const student = await studentRepo.getStudentById(studentId);
    if (!student) return;

    const template = emailTemplates.attendanceConfirmation({
      studentName: student.nome,
      eventName: eventName,
      credits: credits,
      totalCredits: totalCredits,
    });

    await emailService.sendEmail(
      student.email || "",
      template.subject,
      template.html
    );

    // Criar notificação no banco
    await notificationRepo.createNotification({
      studentId,
      tipo: "creditos_recebidos",
      titulo: "Créditos Recebidos",
      mensagem: `Você recebeu ${credits} créditos por participar do evento "${eventName}". Total acumulado: ${totalCredits}`,
      enviado: true,
      dataEnvio: new Date(),
    });
  } catch (error) {
    console.error("[NOTIFICATION] Erro ao notificar créditos:", error);
  }
}

/**
 * Notificar alunos sobre novo evento criado
 */
export async function notifyStudentsNewEvent(eventName: string, eventDate: Date) {
  const students = await studentRepo.getAllStudents();

  for (const student of students) {
    await notificationRepo.createNotification({
      studentId: student.id,
      tipo: "novo_evento",
      titulo: "Novo Evento Disponível",
      mensagem: `Um novo evento "${eventName}" foi criado para ${eventDate.toLocaleDateString("pt-BR")}. Registre sua presença!`,
      enviado: false,
    });
  }

  console.log(`[EMAIL] Notificação de novo evento enviada para ${students.length} alunos`);
}

/**
 * Notificar aluno quando certificado fica disponível
 */
export async function notifyStudentCertificateAvailable(
  studentId: number,
  eventName: string
) {
  const student = await studentRepo.getStudentById(studentId);
  if (!student) return;

  await notificationRepo.createNotification({
    studentId,
    tipo: "certificado_disponivel",
    titulo: "Certificado Disponível",
    mensagem: `Seu certificado de participação no evento "${eventName}" está disponível para download!`,
    enviado: false,
  });

  console.log(`[EMAIL] Notificação de certificado enviada para ${student.email ?? "email não informado"}`);
}

export async function registerAttendance(
  studentId: number,
  eventId: number
) {
  try {
    // 1. Validar existência
    const student = await studentRepo.getStudentById(studentId);
    if (!student) {
      throw new AppError("Aluno não encontrado", 404);
    }

    const event = await eventRepo.getEventById(eventId);
    if (!event) {
      throw new AppError("Evento não encontrado", 404);
    }

    // 2. Validar evento ativo
    if (!event.ativo) {
      throw new AppError("Evento não está ativo", 400);
    }

    // 3. Validar duplicidade
    const existing = await attendanceRepo.getAttendanceByStudentAndEvent(
      studentId,
      eventId
    );

    if (existing) {
      throw new AppError("Presença já registrada", 409);
    }

    // 4. Calcular créditos
    const previousCredits = Number(student.creditosTotais ?? 0);
    const eventCredits = Number(event.creditos ?? 0);
    const newTotal = previousCredits + eventCredits;

    // ⚠️ ORDEM CORRETA (consistência lógica)

    // 5. Registrar presença
    const attendanceResult = await attendanceRepo.createAttendance({
      studentId,
      eventId,
      creditosRegistrados: event.creditos.toString(),
    });

    // ⚠️ IMPORTANTE: drizzle não retorna id direto
    // então não use attendance.id
    const attendanceId = attendanceResult?.id ?? null;

    // 6. Atualizar créditos
    await studentRepo.updateStudent(studentId, {
      creditosTotais: newTotal.toString(),
    });

    // 7. Histórico
    await attendanceRepo.createCreditHistory({
      studentId,
      eventId,
      creditosAdicionados: eventCredits.toString(),
      creditosTotaisApos: newTotal.toString(),
      descricao: `Créditos recebidos no evento "${event.nome}"`,
    });

    // 8. Notificação
    await notifyStudentCreditsReceived(
      studentId,
      event.nome,
      eventCredits,
      newTotal
    );

    return {
      success: true,
      message: "Presença registrada com sucesso",
      data: {
        attendanceId,
        creditosAdicionados: eventCredits,
        totalCreditos: newTotal,
      },
    };
  } catch (error: any) {
    console.error("[ATTENDANCE] Erro ao registrar presença:", error);

    if (error instanceof AppError) {
      return {
        success: false,
        message: error.message,
        statusCode: error.statusCode,
      };
    }

    return {
      success: false,
      message: "Erro interno ao registrar presença",
      statusCode: 500,
    };
  }
}

/**
 * Enviar notificações pendentes (chamado periodicamente)
 */
export async function sendPendingNotifications() {
  try {
    const pendingNotifications = await notificationRepo.getUnsentNotifications();

    for (const notification of pendingNotifications) {
      const student = await studentRepo.getStudentById(notification.studentId);
      if (!student) continue;

      if (student.email) {
        const template = emailTemplates.generic({
          title: notification.titulo,
          studentName: student.nome,
          message: notification.mensagem,
        });

        const emailSent = await emailService.sendEmail(
          student.email,
          template.subject,
          template.html
        );

        if (emailSent) {
          await notificationRepo.updateNotification(notification.id, {
            enviado: true,
            dataEnvio: new Date(),
          });
        }
      } else {
        // Se não tem email, marca como enviado mesmo assim
        await notificationRepo.updateNotification(notification.id, {
          enviado: true,
          dataEnvio: new Date(),
        });
      }
    }

    console.log(`[NOTIFICATIONS] ${pendingNotifications.length} notificações processadas`);
  } catch (error) {
    console.error("[NOTIFICATIONS] Erro ao enviar notificações:", error);
  }
}

/**
 * Notifica aluno quando créditos estão baixos
 */
export async function notifyLowCredits(
  studentId: number,
  minimumRequired: number = 10
) {
  try {
    const student = await studentRepo.getStudentById(studentId);
    if (!student) return;

    const currentCredits = parseFloat(student.creditosTotais.toString());

    // Só notifica se realmente está baixo
    if (currentCredits >= minimumRequired) return;

    const template = emailTemplates.lowCreditsWarning({
      studentName: student.nome,
      currentCredits,
      minimumRequired,
      dashboardUrl: "https://seu-dominio.com/dashboard", // AJUSTE ISTO
    } );

    await emailService.sendEmail(
      student.email || "",
      template.subject,
      template.html
    );

    // Criar notificação no banco
    await notificationRepo.createNotification({
      studentId,
      tipo: "creditos_baixos",
      titulo: "Aviso: Créditos Baixos",
      mensagem: `Seus créditos (${currentCredits}) estão abaixo do mínimo recomendado (${minimumRequired})`,
      enviado: true,
      dataEnvio: new Date(),
    });
  } catch (error) {
    console.error("[NOTIFICATION] Erro ao notificar créditos baixos:", error);
  }
}

/**
 * Notificar proprietário quando QR Code é inválido
 */
export async function notifyOwnerInvalidQRAttempt(
  studentName: string,
  eventName: string
) {
  try {
    await emailService.notifyOwnerInvalidQR(
      studentName,
      eventName,
      new Date()
    );
  } catch (error) {
    console.error("[NOTIFICATION] Erro ao notificar proprietário sobre QR inválido:", error);
  }
}

/**
 * Notificar proprietário quando certificado falha
 */
export async function notifyOwnerCertificateError(
  studentName: string,
  eventName: string,
  errorMessage: string
) {
  try {
    await emailService.notifyOwnerCertificateFailure(
      studentName,
      eventName,
      errorMessage
    );
  } catch (error) {
    console.error("[NOTIFICATION] Erro ao notificar proprietário sobre falha de certificado:", error);
  }
}

/**
 * Notificar proprietário sobre evento com baixa participação
 */
export async function notifyOwnerLowParticipationEvent(
  eventName: string,
  participantCount: number
) {
  try {
    await emailService.notifyOwnerLowParticipation(eventName, participantCount);
  } catch (error) {
    console.error("[NOTIFICATION] Erro ao notificar proprietário sobre baixa participação:", error);
  }
}

/**
 * Gerar e enviar resumo diário ao proprietário
 */
export async function sendOwnerDailySummary() {
  try {
    // Coletar estatísticas do dia
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Contar presenças de hoje
    const allAttendances = await attendanceRepo.getAllAttendances();
    const todayAttendances = allAttendances.filter((a: any) => {
      const attendanceDate = new Date(a.timestamp);
      return attendanceDate >= today && attendanceDate < tomorrow;
    }).length;

    // Contar certificados de hoje
    const allCertificates =
      await certificateRepo.getAllCertificates?.() || [];

    const todayCertificates = allCertificates.filter((c: any) => {
      const emissionDate = new Date(c.createdAt);

      return emissionDate >= today && emissionDate < tomorrow;
    }).length;

    // Contar eventos
    const events = await eventRepo.getAllEvents?.() || [];
    const totalEvents = events.length;

    // Top 5 alunos mais ativos
    const students = await studentRepo.getAllStudents?.() || [];
    const topStudents = await Promise.all(
      students.map(async (s: any) => ({
        name: s.nome,
        participations: (await attendanceRepo.getAttendancesByStudent?.(s.id) || []).length,
      }))
    );
    topStudents.sort((a, b) => b.participations - a.participations);

    // Enviar email
    await emailService.sendDailySummary(
      todayAttendances,
      todayCertificates,
      totalEvents,
      topStudents
    );

    console.log("[NOTIFICATION] Resumo diário enviado ao proprietário");
  } catch (error) {
    console.error("[NOTIFICATION] Erro ao enviar resumo diário:", error);
  }
}

/**
 * Testa a conexão com o servidor de email
 */
export async function testEmailConnection() {
  return await emailService.testEmailConnection();
}

// ============ RE-EXPORTAR FUNÇÕES DE ANÁLISE ============
export const generateFrequencyAnalysis = analysisService.generateFrequencyAnalysis;
export const generateImprovementSuggestions = analysisService.generateImprovementSuggestions;
