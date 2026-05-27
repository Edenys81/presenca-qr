import * as db from "../database/db.js";
import { analyses } from "../drizzle/schema.js";

type AnalysisType = typeof db.analyses.$inferSelect.tipo;

export async function createAnalysis(
  data: typeof analyses.$inferInsert
) {
  return db.createAnalysis(data);
}

export async function getLatestAnalyses() {
  return db.getLatestAnalyses();
}

export async function getAnalysesByType(tipo: AnalysisType) {
  return db.getAnalysesByType(tipo);
}