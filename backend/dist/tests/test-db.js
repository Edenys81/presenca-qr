import { getDb } from "../database/db.js";
async function testConnection() {
    try {
        const db = await getDb();
        if (!db) {
            console.log("❌ Banco não conectado (getDb retornou null)");
            return;
        }
        console.log("✅ Conexão Drizzle OK");
        const result = await db.execute("SELECT 1 as test");
        console.log("Resultado:", result);
        console.log("✅ Banco funcionando corretamente");
    }
    catch (error) {
        console.error("❌ Erro:", error);
    }
}
testConnection();
