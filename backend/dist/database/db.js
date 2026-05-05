import mysql from "mysql2/promise";
import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { users, students, events, attendances, creditHistory, certificates, notifications, analyses } from "../drizzle/schema.js";
import { ENV } from "../core/env.js";
let _db = null;
export async function getDb() {
    if (!_db) {
        try {
            const connection = await mysql.createConnection({
                host: "localhost",
                user: "root",
                password: "mneEAC81",
                database: "sistema_presenca_qrcode",
            });
            _db = drizzle(connection);
        }
        catch (error) {
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
export async function upsertUser(user) {
    if (!user.openId) {
        throw new Error("User openId is required for upsert");
    }
    const db = await getDb();
    if (!db) {
        console.warn("[Database] Cannot upsert user: database not available");
        return;
    }
    try {
        const values = {
            openId: user.openId,
        };
        const updateSet = {};
        const textFields = ["name", "email", "loginMethod"];
        const assignNullable = (field) => {
            const value = user[field];
            if (value === undefined)
                return;
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
        }
        else if (user.openId === ENV.ownerOpenId) {
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
    }
    catch (error) {
        console.error("[Database] Failed to upsert user:", error);
        throw error;
    }
}
// ================= STUDENT =================
export async function getStudentByUserId(userId) {
    const db = await getDb();
    if (!db)
        return undefined;
    const result = await db
        .select()
        .from(students)
        .where(eq(students.userId, userId))
        .limit(1);
    return result[0];
}
export async function getStudentById(studentId) {
    const db = await getDb();
    if (!db)
        return undefined;
    const result = await db
        .select()
        .from(students)
        .where(eq(students.id, studentId))
        .limit(1);
    return result[0];
}
export async function createStudent(data) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const result = await db.insert(students).values(data);
    return result;
}
export async function updateStudent(studentId, data) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    return db.update(students).set(data).where(eq(students.id, studentId));
}
export async function getAllStudents() {
    const db = await getDb();
    // if (!db) return [];
    if (!db)
        throw new Error("Database not available");
    return db.select().from(students);
}
// ============ EVENT QUERIES ============
export async function createEvent(data) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    const result = await db.insert(events).values(data);
    return result;
}
export async function getEventById(eventId) {
    const db = await getDb();
    if (!db)
        return undefined;
    const result = await db
        .select()
        .from(events)
        .where(eq(events.id, eventId))
        .limit(1);
    return result.length > 0 ? result[0] : undefined;
}
export async function getAllEvents() {
    const db = await getDb();
    if (!db)
        return [];
    return db.select().from(events).orderBy(desc(events.createdAt));
}
export async function getActiveEvents() {
    const db = await getDb();
    if (!db)
        return [];
    return db
        .select()
        .from(events)
        .where(eq(events.ativo, true))
        .orderBy(desc(events.data));
}
export async function updateEvent(eventId, data) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    return db.update(events).set(data).where(eq(events.id, eventId));
}
export async function deleteEvent(eventId) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    return db.delete(events).where(eq(events.id, eventId));
}
// ============ ATTENDANCE QUERIES ============
export async function createAttendance(data) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    return db.insert(attendances).values(data);
}
export async function getAttendanceByStudentAndEvent(studentId, eventId) {
    const db = await getDb();
    if (!db)
        return undefined;
    const result = await db
        .select()
        .from(attendances)
        .where(and(eq(attendances.studentId, studentId), eq(attendances.eventId, eventId)))
        .limit(1);
    return result.length > 0 ? result[0] : undefined;
}
export async function getAttendancesByEvent(eventId) {
    const db = await getDb();
    if (!db)
        return [];
    return db
        .select()
        .from(attendances)
        .where(eq(attendances.eventId, eventId))
        .orderBy(desc(attendances.timestamp));
}
export async function getAttendancesByStudent(studentId) {
    const db = await getDb();
    if (!db)
        return [];
    return db
        .select()
        .from(attendances)
        .where(eq(attendances.studentId, studentId))
        .orderBy(desc(attendances.timestamp));
}
// ============ CREDIT HISTORY QUERIES ============
export async function createCreditHistory(data) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    return db.insert(creditHistory).values(data);
}
export async function getCreditHistoryByStudent(studentId) {
    const db = await getDb();
    if (!db)
        return [];
    return db
        .select()
        .from(creditHistory)
        .where(eq(creditHistory.studentId, studentId))
        .orderBy(desc(creditHistory.createdAt));
}
// ============ CERTIFICATE QUERIES ============
export async function createCertificate(data) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    return db.insert(certificates).values(data);
}
export async function getCertificateById(certificateId) {
    const db = await getDb();
    if (!db)
        return undefined;
    const result = await db
        .select()
        .from(certificates)
        .where(eq(certificates.id, certificateId))
        .limit(1);
    return result.length > 0 ? result[0] : undefined;
}
export async function getCertificatesByStudent(studentId) {
    const db = await getDb();
    if (!db)
        return [];
    return db
        .select()
        .from(certificates)
        .where(eq(certificates.studentId, studentId))
        .orderBy(desc(certificates.dataEmissao));
}
export async function getCertificateByAttendance(attendanceId) {
    const db = await getDb();
    if (!db)
        return undefined;
    const result = await db
        .select()
        .from(certificates)
        .where(eq(certificates.attendanceId, attendanceId))
        .limit(1);
    return result.length > 0 ? result[0] : undefined;
}
// ============ NOTIFICATION QUERIES ============
export async function createNotification(data) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    return db.insert(notifications).values(data);
}
export async function getNotificationsByStudent(studentId) {
    const db = await getDb();
    if (!db)
        return [];
    return db
        .select()
        .from(notifications)
        .where(eq(notifications.studentId, studentId))
        .orderBy(desc(notifications.createdAt));
}
export async function getUnsentNotifications() {
    const db = await getDb();
    if (!db)
        return [];
    return db
        .select()
        .from(notifications)
        .where(eq(notifications.enviado, false));
}
export async function updateNotification(notificationId, data) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    return db
        .update(notifications)
        .set(data)
        .where(eq(notifications.id, notificationId));
}
// ============ ANALYSIS QUERIES ============
export async function createAnalysis(data) {
    const db = await getDb();
    if (!db)
        throw new Error("Database not available");
    return db.insert(analyses).values(data);
}
export async function getAnalysesByType(tipo) {
    const db = await getDb();
    if (!db)
        return [];
    return db
        .select()
        .from(analyses)
        .where(eq(analyses.tipo, tipo))
        .orderBy(desc(analyses.dataGeracao));
}
export async function getLatestAnalyses() {
    const db = await getDb();
    if (!db)
        return [];
    return db.select().from(analyses).orderBy(desc(analyses.dataGeracao)).limit(10);
}
export { students, events, attendances, creditHistory, notifications };
