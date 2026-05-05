import * as db from "../database/db.js";

export async function createAnalysis(data: any) {
  return db.createAnalysis(data);
}

export async function getLatestAnalyses() {
  return db.getLatestAnalyses();
}

export async function getAnalysesByType(tipo: string) {
  return db.getAnalysesByType(tipo);
}