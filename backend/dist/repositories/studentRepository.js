import * as db from "../database/db.js";
export async function getStudentById(studentId) {
    return db.getStudentById(studentId);
}
export async function getAllStudents() {
    return db.getAllStudents();
}
export async function updateStudent(studentId, data) {
    return db.updateStudent(studentId, data);
}
