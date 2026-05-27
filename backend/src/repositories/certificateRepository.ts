import * as db from "../database/db.js";
import { certificates } from "../drizzle/schema.js";

export async function getAllCertificates() {
  return db.getAllCertificates();
}

export async function getCertificateById(certificateId: number) {
  return db.getCertificateById(certificateId);
}

export async function getCertificatesByStudent(studentId: number) {
  return db.getCertificatesByStudent(studentId);
}

export async function getCertificateByAttendance(attendanceId: number) {
  return db.getCertificateByAttendance(attendanceId);
}

export async function createCertificate(
    data: typeof certificates.$inferInsert
) {
  return db.createCertificate(data);
}