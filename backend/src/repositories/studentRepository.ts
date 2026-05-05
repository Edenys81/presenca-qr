import * as db from "../database/db.js";

export async function getStudentById(studentId: number) {
  return db.getStudentById(studentId);
}

export async function getAllStudents() {
  return db.getAllStudents();
}

export async function updateStudent(
  studentId: number,
  data: any
) {
  return db.updateStudent(studentId, data);
}