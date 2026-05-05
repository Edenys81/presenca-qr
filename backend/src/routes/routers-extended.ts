import { protectedProcedure, router } from "../trpc/trpc.js";
import { z } from "zod";
import * as db from "../database/db.js";
import * as services from "../services/services.js";
import * as certificates from "../certificates/certificates.js";
import { TRPCError } from "@trpc/server";

// ============ ADMIN PROCEDURE ============
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

// ============ ANALYSIS ROUTER ============
export const analysisRouter = router({
  // Buscar análise de frequência (última)
  getFrequencyAnalysis: adminProcedure.query(async () => {
    const analyses = await db.getAnalysesByType("frequencia");
    return analyses.length > 0 ? analyses[0] : null;
  }),

  // Buscar sugestões (última)
  getImprovementSuggestions: adminProcedure.query(async () => {
    const analyses = await db.getAnalysesByType("sugestoes");
    return analyses.length > 0 ? analyses[0] : null;
  }),

  // Gerar análise de frequência (SALVA NO BANCO)
  generateFrequencyAnalysis: adminProcedure.mutation(async ({ ctx }) => {
    const analysis = await services.generateFrequencyAnalysis(ctx.user.id);

    await db.createAnalysis({
      tipo: "frequencia",
      conteudo:
        typeof analysis === "string"
          ? analysis
          : JSON.stringify(analysis),
      criadoPor: ctx.user.id,
    });

    return { success: true, analysis };
  }),

  // Gerar sugestões (AGORA SALVA NO BANCO)
  generateImprovementSuggestions: adminProcedure.mutation(async ({ ctx }) => {
    const suggestions = await services.generateImprovementSuggestions(ctx.user.id);

    await db.createAnalysis({
      tipo: "sugestoes",
      conteudo:
        typeof suggestions === "string"
          ? suggestions
          : JSON.stringify(suggestions),
      criadoPor: ctx.user.id,
    });

    return { success: true, suggestions };
  }),

  // Listar análises recentes
  getAllAnalyses: adminProcedure.query(async () => {
    return await db.getLatestAnalyses();
  }),
});

// ============ CERTIFICATE ROUTER ============
export const certificateRouter = router({
  // Gerar certificado para o aluno após a presença
  generateCertificate: protectedProcedure
    .input(
      z.object({
        studentId: z.number(),
        eventId: z.number(),
        attendanceId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verificar se o usuário é admin ou o próprio aluno
      const student = await db.getStudentByUserId(ctx.user.id);

      if (ctx.user.role !== "admin" && student?.id !== input.studentId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only generate certificates for yourself",
        });
      }

      // Verificar se já existe certificado
      const existing = await db.getCertificateByAttendance(input.attendanceId);
      if (existing) {
        return existing;
      }

      const result = await certificates.generateCertificatePDF(
        input.studentId,
        input.eventId,
        input.attendanceId
      );

    // notificar aluno
      const event = await db.getEventById(input.eventId);
      if (event) {
        await services.notifyStudentCertificateAvailable(
          input.studentId,
          event.nome
        );
      }

      return result;
    }),

  // obter certificados via URL
  getCertificateUrl: protectedProcedure
    .input(z.object({ certificateId: z.number() }))
    .query(async ({ input }) => {
      const certificate = await db.getCertificateById(input.certificateId);

      if (!certificate) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Certificate not found",
        });
      }

      return {
        url: certificate.certificateUrl,
        validationCode: certificate.qrCodeValidacao,
      };
    }),

  // Validar certificados
  validateCertificate: protectedProcedure
    .input(z.object({ validationCode: z.string() }))
    .query(async ({ input }) => {
      const result = await certificates.validateCertificate(input.validationCode);
      return result;
    }),
});

// ============ NOTIFICATION ROUTER ============
export const notificationRouter = router({
  // Get notifications for current user
  getNotifications: protectedProcedure.query(async ({ ctx }) => {
    const student = await db.getStudentByUserId(ctx.user.id);
    if (!student) return [];

    return await db.getNotificationsByStudent(student.id);
  }),

  // Marcar notificações como lida
  markAsRead: protectedProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(async ({ input }) => {
      await db.updateNotification(input.notificationId, {
        enviado: true,
      });

      return { success: true };
    }),

  // Enviar notificações pendentes (apenas administrador)
  sendPendingNotifications: adminProcedure.mutation(async () => {
    await services.sendPendingNotifications();
    return { success: true };
  }),
});
