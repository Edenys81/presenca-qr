import * as db from "../database/db.js";

export async function getAllEvents() {
  return db.getAllEvents();
}

export async function getEventById(eventId: number) {
  return db.getEventById(eventId);
}

export async function createEvent(data: any) {
  return db.createEvent(data);
}

export async function updateEvent(eventId: number, data: any) {
  return db.updateEvent(eventId, data);
}

export async function deleteEvent(eventId: number) {
  return db.deleteEvent(eventId);
}