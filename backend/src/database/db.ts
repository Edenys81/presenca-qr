import mysql from "mysql2/promise";
import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { MySql2Database } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  students,
  events,
  attendances,
  creditHistory,
  certificates,
  notifications,
  analyses,
  Student
} from "../drizzle/schema.js";
import { ENV } from "../core/env.js";


let _db: MySql2Database | null = null;

export async function getDb() {
  if (!_db) {
    try {
      const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });
      _db = drizzle(connection);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
/* export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
} */

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return result[0];
}

// ================= STUDENT =================

export async function getStudentByUserId(userId: number): Promise<Student | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(students)
    .where(eq(students.userId, userId))
    .limit(1);

  return result[0];
}

export async function getStudentById(studentId: number): Promise<Student | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1);

  return result[0];
}
export async function createStudent(data: typeof students.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(students).values(data);
  return result;
}

export async function updateStudent(
  studentId: number,
  data: Partial<typeof students.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(students).set(data).where(eq(students.id, studentId));
}

export async function getAllStudents() {
  const db = await getDb();
  // if (!db) return [];
  if (!db) throw new Error("Database not available");

  return db.select().from(students);
}

// ============ EVENT QUERIES ============

export async function createEvent(data: typeof events.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(events).values(data);
  return result;
}

export async function getEventById(eventId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getEventByQrCodeId(qrCodeId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(events)
    .where(eq(events.qrCodeId, qrCodeId))
    .limit(1);

  return result[0];
}

export async function getAllEvents() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(events).orderBy(desc(events.createdAt));
}

export async function getActiveEvents() {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(events)
    .where(eq(events.ativo, true))
    .orderBy(desc(events.data));
}

export async function updateEvent(
  eventId: number,
  data: Partial<typeof events.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(events).set(data).where(eq(events.id, eventId));
}

export async function deleteEvent(eventId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.delete(events).where(eq(events.id, eventId));
}

// ============ ATTENDANCE QUERIES ============

export async function createAttendance(data: typeof attendances.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result: any = await db.insert(attendances).values(data);

  return {
    id: result.insertId ?? null
  };
}

export async function getAttendanceByStudentAndEvent(
  studentId: number,
  eventId: number
) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(attendances)
    .where(
      and(
        eq(attendances.studentId, studentId),
        eq(attendances.eventId, eventId)
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getAttendancesByEvent(eventId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(attendances)
    .where(eq(attendances.eventId, eventId))
    .orderBy(desc(attendances.timestamp));
}

export async function getAttendancesByStudent(studentId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(attendances)
    .where(eq(attendances.studentId, studentId))
    .orderBy(desc(attendances.timestamp));
}

// ============ CREDIT HISTORY QUERIES ============

export async function createCreditHistory(
  data: typeof creditHistory.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(creditHistory).values(data);
}

export async function getCreditHistoryByStudent(studentId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(creditHistory)
    .where(eq(creditHistory.studentId, studentId))
    .orderBy(desc(creditHistory.createdAt));
}

// ============ CERTIFICATE QUERIES ============

export async function createCertificate(
  data: typeof certificates.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(certificates).values(data);
}

export async function getCertificateById(certificateId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(certificates)
    .where(eq(certificates.id, certificateId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getCertificatesByStudent(studentId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(certificates)
    .where(eq(certificates.studentId, studentId))
    .orderBy(desc(certificates.dataEmissao));
}

export async function getCertificateByAttendance(attendanceId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(certificates)
    .where(eq(certificates.attendanceId, attendanceId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ NOTIFICATION QUERIES ============

export async function createNotification(
  data: typeof notifications.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(notifications).values(data);
}

export async function getNotificationsByStudent(studentId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(notifications)
    .where(eq(notifications.studentId, studentId))
    .orderBy(desc(notifications.createdAt));
}

export async function getUnsentNotifications() {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(notifications)
    .where(eq(notifications.enviado, false));
}

export async function updateNotification(
  notificationId: number,
  data: Partial<typeof notifications.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .update(notifications)
    .set(data)
    .where(eq(notifications.id, notificationId));
}

// ============ ANALYSIS QUERIES ============

export async function createAnalysis(data: typeof analyses.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(analyses).values(data);
}

export async function getAnalysesByType(tipo: string) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(analyses)
    .where(eq(analyses.tipo, tipo as any))
    .orderBy(desc(analyses.dataGeracao));
}

export async function getLatestAnalyses() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(analyses).orderBy(desc(analyses.dataGeracao)).limit(10);
}

export {
  students,
  events,
  attendances,
  creditHistory,
  notifications
};