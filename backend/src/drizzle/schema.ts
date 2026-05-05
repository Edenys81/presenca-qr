import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  datetime,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with role-based access control for admin (secretaria) and user (alunos).
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Tabela de alunos com informações acadêmicas
 */
export const students = mysqlTable("students", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  matricula: varchar("matricula", { length: 50 }).notNull().unique(),
  nome: text("nome").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  curso: varchar("curso", { length: 255 }).notNull(),
  creditosTotais: decimal("creditosTotais", { precision: 10, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Student = typeof students.$inferSelect;
export type InsertStudent = typeof students.$inferInsert;

/**
 * Tabela de eventos acadêmicos
 */
export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  data: datetime("data").notNull(),
  horario: varchar("horario", { length: 5 }).notNull(), // HH:MM
  local: varchar("local", { length: 255 }).notNull(),
  cargaHoraria: decimal("cargaHoraria", { precision: 5, scale: 2 }).notNull(),
  creditos: decimal("creditos", { precision: 5, scale: 2 }).notNull(),
  qrCodeData: text("qrCodeData").notNull(), // JSON string com dados do evento
  qrCodeUrl: varchar("qrCodeUrl", { length: 2000 }),
  qrCodeId: varchar("qrCodeId", { length: 255 }).notNull().unique(),
  ativo: boolean("ativo").default(true).notNull(),
  criadoPor: int("criadoPor").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

/**
 * Tabela de presenças (registro de presença do aluno em eventos)
 */
export const attendances = mysqlTable("attendances", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull().references(() => students.id, { onDelete: "cascade" }),
  eventId: int("eventId").notNull().references(() => events.id, { onDelete: "cascade" }),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  creditosRegistrados: decimal("creditosRegistrados", { precision: 5, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => {
  return {
    uniqueAttendance: uniqueIndex("unique_attendance").on(
      table.studentId,
      table.eventId
    ),
  };
});

export type Attendance = typeof attendances.$inferSelect;
export type InsertAttendance = typeof attendances.$inferInsert;

/**
 * Tabela de histórico de créditos do aluno
 */
export const creditHistory = mysqlTable("creditHistory", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull().references(() => students.id, { onDelete: "cascade" }),
  eventId: int("eventId").notNull().references(() => events.id, { onDelete: "cascade" }),
  creditosAdicionados: decimal("creditosAdicionados", { precision: 5, scale: 2 }).notNull(),
  creditosTotaisApos: decimal("creditosTotaisApos", { precision: 10, scale: 2 }).notNull(),
  descricao: text("descricao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CreditHistory = typeof creditHistory.$inferSelect;
export type InsertCreditHistory = typeof creditHistory.$inferInsert;

/**
 * Tabela de certificados
 */
export const certificates = mysqlTable("certificates", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull().references(() => students.id, { onDelete: "cascade" }),
  eventId: int("eventId").notNull().references(() => events.id, { onDelete: "cascade" }),
  attendanceId: int("attendanceId").notNull().references(() => attendances.id, { onDelete: "cascade" }),
  certificateUrl: text("certificateUrl").notNull(),
  qrCodeValidacao: text("qrCodeValidacao").notNull(),
  dataEmissao: timestamp("dataEmissao").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Certificate = typeof certificates.$inferSelect;
export type InsertCertificate = typeof certificates.$inferInsert;

/**
 * Tabela de notificações enviadas
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull().references(() => students.id, { onDelete: "cascade" }),
  tipo: mysqlEnum("tipo", ["creditos_recebidos", "novo_evento", "certificado_disponivel"]).notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  mensagem: text("mensagem").notNull(),
  enviado: boolean("enviado").default(false).notNull(),
  dataEnvio: timestamp("dataEnvio"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Tabela de análises e insights gerados pelo LLM
 */
export const analyses = mysqlTable("analyses", {
  id: int("id").autoincrement().primaryKey(),
  tipo: mysqlEnum("tipo", ["frequencia", "padroes", "sugestoes"]).notNull(),
  conteudo: text("conteudo").notNull(),
  criadoPor: int("criadoPor").notNull().references(() => users.id, { onDelete: "cascade" }),
  dataGeracao: timestamp("dataGeracao").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Analysis = typeof analyses.$inferSelect;
export type InsertAnalysis = typeof analyses.$inferInsert;
