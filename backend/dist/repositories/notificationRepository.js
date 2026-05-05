import * as db from "../database/db.js";
export async function createNotification(data) {
    return db.createNotification(data);
}
export async function getUnsentNotifications() {
    return db.getUnsentNotifications();
}
export async function updateNotification(id, data) {
    return db.updateNotification(id, data);
}
