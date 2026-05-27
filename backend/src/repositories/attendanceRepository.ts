import * as db from "../database/db.js";
import {
  attendances,
  creditHistory,
} from "../drizzle/schema.js";

export async function getAttendancesByStudent(studentId: number) {
  return db.getAttendancesByStudent(studentId);
}

export async function getAttendancesByEvent(eventId: number) {
  return db.getAttendancesByEvent(eventId);
}

export async function getAttendanceByStudentAndEvent(
  studentId: number,
  eventId: number
) {
  return db.getAttendanceByStudentAndEvent(studentId, eventId);
}

export async function getAllAttendances() {
  return db.getAllAttendances();
}

export async function createAttendance(
  data: typeof attendances.$inferInsert
) {
  return db.createAttendance(data);
}

export async function createCreditHistory(
  data: typeof creditHistory.$inferInsert
) {
  return db.createCreditHistory(data);
}
