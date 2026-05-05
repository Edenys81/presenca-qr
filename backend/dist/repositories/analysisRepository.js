import * as db from "../database/db.js";
export async function createAnalysis(data) {
    return db.createAnalysis(data);
}
export async function getLatestAnalyses() {
    return db.getLatestAnalyses();
}
export async function getAnalysesByType(tipo) {
    return db.getAnalysesByType(tipo);
}
