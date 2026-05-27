import * as db from "../database/db.js";
import { students } from "../drizzle/schema.js";

export async function getStudentById(studentId: number) {
  return db.getStudentById(studentId);
}

export async function getStudentByUserId(userId: number) {
  return db.getStudentByUserId(userId);
}

export async function getAllStudents() {
  return db.getAllStudents();
}

export async function createStudent(
  data: typeof students.$inferInsert
) {
  return db.createStudent(data);
}

export async function updateStudent(
  studentId: number,
  data: Partial<typeof students.$inferInsert>
) {
  return db.updateStudent(studentId, data);
}