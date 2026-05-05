import * as db from "../database/db.js";

export async function createNotification(data: any) {
  return db.createNotification(data);
}

export async function getUnsentNotifications() {
  return db.getUnsentNotifications();
}

export async function updateNotification(id: number, data: any) {
  return db.updateNotification(id, data);
}