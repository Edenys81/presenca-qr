import * as db from "../database/db.js";
export async function getAttendancesByStudent(studentId) {
    return db.getAttendancesByStudent(studentId);
}
export async function getAttendancesByEvent(eventId) {
    return db.getAttendancesByEvent(eventId);
}
export async function getAttendanceByStudentAndEvent(studentId, eventId) {
    return db.getAttendanceByStudentAndEvent(studentId, eventId);
}
export async function createAttendance(data) {
    return db.createAttendance(data);
}
