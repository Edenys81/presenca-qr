import * as services from "../services/services.js";
import * as emailService from "../services/emailService.js";
import * as certificates from "../certificates/certificates.js";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { systemRouter } from "../core/systemRouter.js";
import { publicProcedure, router, protectedProcedure, adminProcedure } from "../trpc/trpc.js";
import { z } from "zod";
import * as db from "../database/db.js";
import { TRPCError } from "@trpc/server";
import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode";
import { analysisRouter, certificateRouter, notificationRouter, ownerNotificationRouter } from "./routers-extended.js";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => {
      return opts.ctx.user ?? null;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      return new Promise((resolve, reject) => {

        ctx.req.logout((err: any) => {
          if (err) return reject(err);

          if (!ctx.req.session) {
            return resolve({ success: true });
          }

          ctx.req.session.destroy((err: any) => {
            if (err) return reject(err);

            ctx.res.clearCookie("presenca.qr.session", {
              path: "/",
              httpOnly: true,
              sameSite: "lax",
              secure: false,
            });

            resolve({ success: true });
          });
        });

      });
    }),
  }),

  // ============ STUDENT ROUTES ============
  student: router({
    // Get or create student profile
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      let student = await db.getStudentByUserId(ctx.user.id);

      if (!student) {
        console.warn("Student não encontrado, criando automaticamente", ctx.user.id);

        await db.createStudent({
          userId: ctx.user.id,
          matricula: `MAT-${ctx.user.id}-${Date.now()}`,
          nome: ctx.user.name || "Aluno",
          curso: "Não informado",
          email: ctx.user.email || "",
          creditosTotais: "0.00",
        });

        student = await db.getStudentByUserId(ctx.user.id);

        if (!student) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Erro ao criar perfil do aluno",
          });
        }
      }

      return student;
    }),

    // Update student profile
    updateProfile: protectedProcedure
      .input(
        z.object({
          nome: z.string().optional(),
          curso: z.string().optional(),
          matricula: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const student = await db.getStudentByUserId(ctx.user.id);
        if (!student) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Student profile not found",
          });
        }

        await db.updateStudent(student.id, input);
        return await db.getStudentById(student.id);
      }),

    // Get student's credit history
    getCreditHistory: protectedProcedure.query(async ({ ctx }) => {
      const student = await db.getStudentByUserId(ctx.user.id);
      if (!student) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student profile not found",
        });
      }

      const history = await db.getCreditHistoryByStudent(student.id);
      return history;
    }),

    // Get student's attendance history
    getAttendanceHistory: protectedProcedure.query(async ({ ctx }) => {
      const student = await db.getStudentByUserId(ctx.user.id);
      if (!student) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student profile not found",
        });
      }

      const attendances = await db.getAttendancesByStudent(student.id);
      const enriched = await Promise.all(
        attendances.map(async (att) => {
          const event = await db.getEventById(att.eventId);
          return {
            ...att,
            timestamp: new Date(att.timestamp.getTime() + 3 * 60 * 60 * 1000),
            event
          };
        })
      );
      return enriched;
    }),

    // Get student's certificates
    getCertificates: protectedProcedure.query(async ({ ctx }) => {
      const student = await db.getStudentByUserId(ctx.user.id);
      if (!student) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student profile not found",
        });
      }

      const certificates = await db.getCertificatesByStudent(student.id);
      return certificates;
    }),

    // Get total credits
    getTotalCredits: protectedProcedure.query(async ({ ctx }) => {
      const student = await db.getStudentByUserId(ctx.user.id);
      if (!student) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student profile not found",
        });
      }

      return {
        totalCredits: parseFloat(student.creditosTotais.toString()),
      };
    }),
  }),

  // ============ EVENT ROUTES ============
  event: router({
    // List all active events
    listActive: publicProcedure.query(async () => {
      return await db.getActiveEvents();
    }),

    // List all events (admin only)
    listAll: adminProcedure.query(async () => {
      return await db.getAllEvents();
    }),

    // Get event by ID
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const event = await db.getEventById(input.id);
        if (!event) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Event not found",
          });
        }
        return event;
      }),

    // Create event (admin only)
    create: adminProcedure
      .input(
        z.object({
          nome: z.string(),
          descricao: z.string().optional(),
          data: z.date(),
          horario: z.string(), // HH:MM
          local: z.string(),
          cargaHoraria: z.number(),
          creditos: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const qrCodeId = uuidv4();

        const payload = {
          qrCodeId,
          timestamp: new Date().toISOString(),
        };

        const qrCodeData = JSON.stringify(payload);
        const qrCodeUrl = await QRCode.toDataURL(qrCodeData);

        await db.createEvent({
          nome: input.nome,
          descricao: input.descricao,
          data: input.data,
          horario: input.horario,
          local: input.local,
          cargaHoraria: input.cargaHoraria.toString(),
          creditos: input.creditos.toString(),
          qrCodeData,
          qrCodeUrl,
          qrCodeId,
          criadoPor: ctx.user.id,
        });

        //return event
        const event = await db.getEventByQrCodeId(qrCodeId);
        return event;
      }),

    // Update event (admin only)
    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          nome: z.string().optional(),
          descricao: z.string().optional(),
          data: z.date().optional(),
          horario: z.string().optional(),
          local: z.string().optional(),
          cargaHoraria: z.number().optional(),
          creditos: z.number().optional(),
          ativo: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const event = await db.getEventById(input.id);
        if (!event) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Event not found",
          });
        }

        const updateData: Record<string, any> = {};
        if (input.nome !== undefined) updateData.nome = input.nome;
        if (input.descricao !== undefined) updateData.descricao = input.descricao;
        if (input.data !== undefined) updateData.data = input.data;
        if (input.horario !== undefined) updateData.horario = input.horario;
        if (input.local !== undefined) updateData.local = input.local;
        if (input.cargaHoraria !== undefined)
          updateData.cargaHoraria = input.cargaHoraria.toString();
        if (input.creditos !== undefined)
          updateData.creditos = input.creditos.toString();
        if (input.ativo !== undefined) updateData.ativo = input.ativo;

        await db.updateEvent(input.id, updateData);
        return await db.getEventById(input.id);
      }),

    // Delete event (admin only)
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const event = await db.getEventById(input.id);
        if (!event) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Event not found",
          });
        }

        await db.deleteEvent(input.id);
        return { success: true };
      }),

    // Get attendance list for event (admin only)
    getAttendanceList: adminProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ input }) => {
        const attendances = await db.getAttendancesByEvent(input.eventId);
        const enriched = await Promise.all(
          attendances.map(async (att) => {
            const student = await db.getStudentById(att.studentId);
            return { ...att, student };
          })
        );
        return enriched;
      }),
  }),

  // ============ ATTENDANCE ROUTES ============
  attendance: router({
    // Register attendance via QR code
    registerByQRCode: protectedProcedure
      .input(
        z.object({
          qrCodeId: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Find event by QR code
        const event = await db.getEventByQrCodeId(input.qrCodeId);

        if (!event) {
          // Notificar proprietário sobre QR inválido
          const student = await db.getStudentByUserId(ctx.user.id);
          if (student) {
            await services.notifyOwnerInvalidQRAttempt(
              student.nome,
              "Evento desconhecido"
            );
          }
          
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Event not found for this QR code",
          });
        }

        // Get student
        const student = await db.getStudentByUserId(ctx.user.id);
        if (!student) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Student profile not found",
          });
        }

        const dbConn = await db.getDb();
        if (!dbConn) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        }

        const creditos = event.creditos.toString();

        const totalCredits = await dbConn.transaction(async (tx) => {

          // 1. Inserção protegida por índice único
          try {
            await tx.insert(db.attendances).values({
              studentId: student.id,
              eventId: event.id,
              creditosRegistrados: creditos,
            });
          } catch (err: any) {
            if (err.code === "ER_DUP_ENTRY") {
              throw new TRPCError({
                code: "CONFLICT",
                message: "Already registered for this event",
              });
            }
            throw err;
          }

          // 2. Update único (sem duplicação!)
          await tx
            .update(db.students)
            .set({
              creditosTotais: sql`${db.students.creditosTotais} + ${creditos}`,
            })
            .where(eq(db.students.id, student.id));

          // 3. Busca valor atualizado
          const studentUpdated = await tx
            .select()
            .from(db.students)
            .where(eq(db.students.id, student.id))
            .limit(1);

          if (studentUpdated.length === 0) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Erro ao atualizar créditos do aluno",
            });
          }

          const newTotal = studentUpdated[0].creditosTotais.toString();

          // 4. Histórico consistente
          await tx.insert(db.creditHistory).values({
            studentId: student.id,
            eventId: event.id,
            creditosAdicionados: creditos,
            creditosTotaisApos: newTotal,
            descricao: `Presença registrada no evento: ${event.nome}`,
          });

          // 5. Notificação
          await tx.insert(db.notifications).values({
            studentId: student.id,
            tipo: "creditos_recebidos",
            titulo: "Créditos Recebidos",
            mensagem: `Você recebeu ${creditos} créditos por participar do evento "${event.nome}"`,
            enviado: false,
          });

          return parseFloat(newTotal);
        });

        // Enviar email de presença registrada
        try {
          await emailService.sendAttendanceNotification(
            student.email,
            student.nome,
            event.nome,
            parseFloat(creditos),
            totalCredits
          );
        } 
        catch (emailError) {
          console.error("[Email] Erro ao enviar email de presença:", emailError);
        }

        // Gerar certificado automaticamente
        try {
          const attendance = await db.getAttendanceByStudentAndEvent(student.id, event.id);
          if (attendance) {
            const certificate = await certificates.generateCertificatePDF(
              student.id,
              event.id,
              attendance.id
            );
            
            // Enviar email com certificado
            await emailService.sendCertificateNotification(
              student.email,
              student.nome,
              event.nome,
              certificate.certificateUrl
            );
          }
        } catch (certError) {
          console.error("[CERTIFICATE] Erro ao gerar certificado:", certError);
        }

        return {
          success: true,
          event,
          creditos: parseFloat(creditos),
          totalCredits,
        };
      }),
  }),

  // ============ ADMIN ROUTES ============
  // Analysis routes
  analysis: analysisRouter,

  // Certificate routes
  certificate: certificateRouter,

  // Notification routes
  notification: notificationRouter,
  ownerNotification: ownerNotificationRouter,

  admin: router({
    // Get all students (admin only)
    getAllStudents: adminProcedure.query(async () => {
      return await db.getAllStudents();
    }),

    // Get student details (admin only)
    getStudentDetails: adminProcedure
      .input(z.object({ studentId: z.number() }))
      .query(async ({ input }) => {
        const student = await db.getStudentById(input.studentId);
        if (!student) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Student not found",
          });
        }

        const attendances = await db.getAttendancesByStudent(input.studentId);
        const creditHistory = await db.getCreditHistoryByStudent(
          input.studentId
        );

        return {
          student,
          attendances,
          creditHistory,
        };
      }),

    // Get dashboard stats (admin only)
    getDashboardStats: adminProcedure.query(async () => {
      const students = await db.getAllStudents();
      const events = await db.getAllEvents();

      let totalCreditsDistributed = 0;
      for (const student of students) {
        totalCreditsDistributed += parseFloat(
          student.creditosTotais.toString()
        );
      }

      return {
        totalStudents: students.length,
        totalEvents: events.length,
        totalCreditsDistributed,
        activeEvents: events.filter((e) => e.ativo).length,
      };
    }),
  }),
});


export type AppRouter = typeof appRouter;

testEmailConnection: adminProcedure.query(async () => {
  const result = await services.testEmailConnection();
  return {
    success: result,
    message: result
      ? "✅ Conexão com email funcionando"
      : "❌ Erro na conexão com email",
  };
})