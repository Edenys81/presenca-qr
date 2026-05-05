import * as db from "../database/db.js";

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

export async function createAttendance(data: any) {
  return db.createAttendance(data);
}

export async function createCreditHistory(data: any) {
  return db.createCreditHistory(data);
}