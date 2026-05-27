import * as db from "../database/db.js";
import { notifications } from "../drizzle/schema.js";

export async function createNotification(
  data: typeof notifications.$inferInsert
) {
  return db.createNotification(data);
}

export async function getUnsentNotifications() {
  return db.getUnsentNotifications();
}

export async function updateNotification(
  id: number,
  data: Partial<typeof notifications.$inferInsert>
) {
  return db.updateNotification(id, data);
}