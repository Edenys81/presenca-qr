import { generateFrequencyAnalysis, generateImprovementSuggestions } from "../services/services.js";
console.log("SERVICES CARREGADO");
async function testFlow() {
    try {
        console.log("🚀 Iniciando teste de fluxo completo...\n");
        const adminId = 1; // precisa existir no banco
        console.log("📊 Gerando análise de frequência...");
        const analysis = await generateFrequencyAnalysis(adminId);
        console.log("✅ Análise gerada:\n", analysis);
        console.log("\n💡 Gerando sugestões...");
        const suggestions = await generateImprovementSuggestions(adminId);
        console.log("✅ Sugestões geradas:\n", suggestions);
        console.log("\n🎉 TESTE FINALIZADO COM SUCESSO");
    }
    catch (error) {
        console.error("❌ ERRO NO TESTE:", error);
    }
}
testFlow();
