import * as db from "../database/db.js";
export async function getAllEvents() {
    return db.getAllEvents();
}
export async function getEventById(eventId) {
    return db.getEventById(eventId);
}
export async function createEvent(data) {
    return db.createEvent(data);
}
export async function updateEvent(eventId, data) {
    return db.updateEvent(eventId, data);
}
export async function deleteEvent(eventId) {
    return db.deleteEvent(eventId);
}
