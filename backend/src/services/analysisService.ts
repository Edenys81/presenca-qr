import * as studentRepo from "../repositories/studentRepository.js";
import * as eventRepo from "../repositories/eventRepository.js";
import * as attendanceRepo from "../repositories/attendanceRepository.js";
import * as analysisRepo from "../repositories/analysisRepository.js";
import { invokeLLM } from "../ia/llm.js";
import { notifyOwner } from "../notification/notification.js";

/**
 * Gerar análises sobre frequência de alunos usando LLM
 */
export async function generateFrequencyAnalysis(adminId: number) {
  try {
    console.log("[ANALYSIS] Iniciando análise de frequência...");

    const students = await studentRepo.getAllStudents();
    const events = await eventRepo.getAllEvents();

    if (students.length === 0) {
      console.warn("[ANALYSIS] Nenhum aluno encontrado para análise");
      return "Nenhum aluno registrado no sistema para análise.";
    }

    // Coletar dados de participação
    const participationData = await Promise.all(
      students.map(async (student) => {
        const attendances = await attendanceRepo.getAttendancesByStudent(student.id);
        const credits = parseFloat(student.creditosTotais?.toString() ?? "0");

        return {
          id: student.id,
          name: student.nome,
          course: student.curso,
          totalCredits: credits,
          participations: attendances.length,
          email: student.email,
        };
      })
    );

    // Calcular estatísticas
    const totalParticipations = participationData.reduce((sum, s) => sum + s.participations, 0);
    const avgParticipationPerStudent = 
      students.length > 0 ? totalParticipations / students.length : 0;
    const topStudents = participationData
      .sort((a, b) => b.participations - a.participations)
      .slice(0, 5);
    const lowParticipationStudents = participationData
      .filter((s) => s.participations === 0)
      .slice(0, 5);

    // Preparar prompt para LLM
    const prompt = `Você é um analista de dados educacional especializado em análise de participação em eventos acadêmicos.

Analise os seguintes dados de participação de alunos e gere insights detalhados:

DADOS GERAIS:
- Total de Alunos: ${students.length}
- Total de Eventos Disponíveis: ${events.length}
- Total de Participações: ${totalParticipations}
- Média de Participações por Aluno: ${avgParticipationPerStudent.toFixed(2)}

TOP 5 ALUNOS COM MELHOR PARTICIPAÇÃO:
${topStudents.map((s) => `- ${s.name} (${s.course}): ${s.participations} eventos, ${s.totalCredits} créditos`).join("\n")}

ALUNOS SEM PARTICIPAÇÃO:
${lowParticipationStudents.length > 0 
  ? lowParticipationStudents.map((s) => `- ${s.name} (${s.course})`).join("\n")
  : "Todos os alunos participaram de pelo menos um evento"}

DADOS DETALHADOS DE PARTICIPAÇÃO:
${JSON.stringify(participationData, null, 2)}

Por favor, forneça uma análise estruturada com:
1. **Padrões Gerais de Frequência**: Identifique tendências principais
2. **Alunos com Melhor Participação**: Reconheça os mais engajados
3. **Alunos com Baixa Participação**: Identifique os que precisam de incentivo
4. **Sugestões de Melhorias**: Estratégias para aumentar a participação
5. **Recomendações para a Secretaria**: Ações práticas a tomar

Responda em português de forma clara, estruturada e acionável.`;

    // Chamar LLM
    let analysisContent: string;

    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "Você é um analista de dados educacional especializado em análise de participação em eventos acadêmicos. Forneça análises detalhadas e acionáveis.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      analysisContent =
        typeof response.choices[0]?.message?.content === "string"
          ? response.choices[0].message.content
          : "Análise não disponível";

      console.log("[ANALYSIS] ✅ Análise gerada com sucesso via LLM");
    } catch (llmError) {
      console.warn("[ANALYSIS] ⚠️ Erro ao chamar LLM, usando análise simplificada", llmError);

      // Análise simplificada como fallback
      analysisContent = generateSimplifiedAnalysis(
        students.length,
        events.length,
        totalParticipations,
        avgParticipationPerStudent,
        topStudents,
        lowParticipationStudents
      );
    }

    // Salvar análise no banco de dados
    const analysis = await analysisRepo.createAnalysis({
      tipo: "frequencia",
      conteudo: analysisContent,
      criadoPor: adminId,
    });

    console.log("[ANALYSIS] ✅ Análise salva no banco com ID:", analysis.id);

    // Notificar admin
    await notifyOwner({
      title: "✅ Análise de Frequência Gerada",
      content: `Uma nova análise sobre padrões de frequência de alunos foi gerada. ${students.length} alunos analisados, ${totalParticipations} participações totais.`,
    });

    return analysisContent;
  } catch (error) {
    console.error("[ANALYSIS] ❌ Erro ao gerar análise de frequência:", error);
    throw error;
  }
}

/**
 * Gerar sugestões de melhorias usando LLM
 */
export async function generateImprovementSuggestions(adminId: number) {
  try {
    console.log("[ANALYSIS] Iniciando geração de sugestões de melhorias...");

    const students = await studentRepo.getAllStudents();
    const events = await eventRepo.getAllEvents();
    const analyses = await analysisRepo.getLatestAnalyses(5);

    if (students.length === 0 || events.length === 0) {
      console.warn("[ANALYSIS] Dados insuficientes para gerar sugestões");
      return "Dados insuficientes no sistema para gerar sugestões de melhorias.";
    }

    // Coletar estatísticas
    let totalParticipations = 0;
    let totalCreditsDistributed = 0;

    for (const student of students) {
      const attendances = await attendanceRepo.getAttendancesByStudent(student.id);
      totalParticipations += attendances.length;
      totalCreditsDistributed += parseFloat(student.creditosTotais?.toString() ?? "0");
    }

    const avgParticipationPerStudent =
      students.length > 0 ? totalParticipations / students.length : 0;
    const avgCreditsPerStudent =
      students.length > 0 ? totalCreditsDistributed / students.length : 0;

    // Preparar prompt para LLM
    const prompt = `Você é um consultor educacional especializado em estratégias de engajamento estudantil.

Baseado nos seguintes dados do sistema de eventos acadêmicos, gere sugestões de melhorias:

ESTATÍSTICAS GERAIS:
- Total de Alunos: ${students.length}
- Total de Eventos: ${events.length}
- Total de Participações: ${totalParticipations}
- Créditos Distribuídos: ${totalCreditsDistributed.toFixed(2)}
- Média de Participações por Aluno: ${avgParticipationPerStudent.toFixed(2)}
- Média de Créditos por Aluno: ${avgCreditsPerStudent.toFixed(2)}

ANÁLISES ANTERIORES:
${analyses.slice(0, 3).map((a) => `- ${a.conteudo.substring(0, 200)}...`).join("\n\n")}

Por favor, gere:
1. **5 Sugestões Práticas**: Para aumentar a participação de alunos
2. **Estratégias de Divulgação**: Melhorar a comunicação sobre eventos
3. **Tipos de Eventos**: Recomendações de eventos mais atraentes
4. **Gamificação**: Propostas para tornar o sistema de créditos mais engajador
5. **Ações Imediatas**: O que fazer nos próximos 30 dias

Responda em português de forma clara, estruturada e acionável.`;

    // Chamar LLM
    let suggestionsContent: string;

    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "Você é um consultor educacional especializado em estratégias de engajamento estudantil. Forneça sugestões práticas e acionáveis.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      suggestionsContent =
        typeof response.choices[0]?.message?.content === "string"
          ? response.choices[0].message.content
          : "Sugestões não disponíveis";

      console.log("[ANALYSIS] ✅ Sugestões geradas com sucesso via LLM");
    } catch (llmError) {
      console.warn("[ANALYSIS] ⚠️ Erro ao chamar LLM, usando sugestões simplificadas", llmError);

      // Sugestões simplificadas como fallback
      suggestionsContent = generateSimplifiedSuggestions(
        students.length,
        events.length,
        avgParticipationPerStudent
      );
    }

    // Salvar sugestões no banco de dados
    const analysis = await analysisRepo.createAnalysis({
      tipo: "sugestoes_melhorias",
      conteudo: suggestionsContent,
      criadoPor: adminId,
    });

    console.log("[ANALYSIS] ✅ Sugestões salvas no banco com ID:", analysis.id);

    // Notificar admin
    await notifyOwner({
      title: "💡 Sugestões de Melhorias Geradas",
      content: `Novas sugestões de melhorias foram geradas baseadas na análise do sistema. Acesse o painel administrativo para visualizar.`,
    });

    return suggestionsContent;
  } catch (error) {
    console.error("[ANALYSIS] ❌ Erro ao gerar sugestões de melhorias:", error);
    throw error;
  }
}

/**
 * Gerar análise de eventos com baixa participação
 */
export async function generateLowParticipationEventAnalysis(adminId: number) {
  try {
    console.log("[ANALYSIS] Analisando eventos com baixa participação...");

    const events = await eventRepo.getAllEvents();

    const eventStats = await Promise.all(
      events.map(async (event) => {
        const attendances = await attendanceRepo.getAttendancesByEvent(event.id);
        return {
          id: event.id,
          name: event.nome,
          date: event.data,
          participations: attendances.length,
          credits: parseFloat(event.creditos?.toString() ?? "0"),
        };
      })
    );

    const lowParticipationEvents = eventStats
      .filter((e) => e.participations < 3)
      .sort((a, b) => a.participations - b.participations);

    if (lowParticipationEvents.length === 0) {
      console.log("[ANALYSIS] Todos os eventos têm boa participação");
      return "Todos os eventos têm boa participação.";
    }

    const prompt = `Você é um especialista em eventos acadêmicos.

Os seguintes eventos tiveram baixa participação:
${lowParticipationEvents.map((e) => `- ${e.name} (${e.date}): ${e.participations} participações`).join("\n")}

Gere sugestões para melhorar a participação nestes eventos específicos.`;

    let analysisContent: string;

    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "Você é um especialista em eventos acadêmicos.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      analysisContent =
        typeof response.choices[0]?.message?.content === "string"
          ? response.choices[0].message.content
          : "Análise não disponível";
    } catch (llmError) {
      console.warn("[ANALYSIS] Usando análise simplificada para eventos", llmError);
      analysisContent = `Eventos com baixa participação detectados: ${lowParticipationEvents.length}. Recomenda-se revisar a divulgação e horários destes eventos.`;
    }

    // Salvar análise
    await analysisRepo.createAnalysis({
      tipo: "eventos_baixa_participacao",
      conteudo: analysisContent,
      criadoPor: adminId,
    });

    return analysisContent;
  } catch (error) {
    console.error("[ANALYSIS] ❌ Erro ao analisar eventos com baixa participação:", error);
    throw error;
  }
}

/**
 * Análise simplificada como fallback
 */
function generateSimplifiedAnalysis(
  totalStudents: number,
  totalEvents: number,
  totalParticipations: number,
  avgParticipation: number,
  topStudents: any[],
  lowParticipationStudents: any[]
) {
  return `
# ANÁLISE DE FREQUÊNCIA - SISTEMA DE PRESENÇA

## 📊 Estatísticas Gerais
- **Total de Alunos:** ${totalStudents}
- **Total de Eventos:** ${totalEvents}
- **Total de Participações:** ${totalParticipations}
- **Média de Participações por Aluno:** ${avgParticipation.toFixed(2)}

## 🏆 Top 5 Alunos com Melhor Participação
${topStudents.map((s, i) => `${i + 1}. **${s.name}** (${s.course}): ${s.participations} eventos, ${s.totalCredits} créditos`).join("\n")}

## ⚠️ Alunos com Baixa Participação
${lowParticipationStudents.length > 0 
  ? lowParticipationStudents.map((s) => `- ${s.name} (${s.course}): 0 participações`).join("\n")
  : "✅ Todos os alunos participaram de pelo menos um evento"}

## 💡 Recomendações
1. **Aumentar Divulgação:** Melhorar a comunicação sobre eventos próximos
2. **Incentivar Participação:** Criar incentivos para alunos com baixa participação
3. **Diversificar Eventos:** Oferecer eventos em diferentes horários e formatos
4. **Reconhecer Engajamento:** Destacar alunos com melhor participação
5. **Analisar Feedback:** Coletar feedback dos alunos sobre eventos

---
*Análise gerada automaticamente pelo Sistema de Presença por QR Code*
`;
}

/**
 * Sugestões simplificadas como fallback
 */
function generateSimplifiedSuggestions(
  totalStudents: number,
  totalEvents: number,
  avgParticipation: number
) {
  return `
# SUGESTÕES DE MELHORIAS - SISTEMA DE PRESENÇA

## 📈 Situação Atual
- **Alunos:** ${totalStudents}
- **Eventos:** ${totalEvents}
- **Participação Média:** ${avgParticipation.toFixed(2)} eventos por aluno

## 🎯 5 Sugestões Práticas

### 1. Aumentar Frequência de Eventos
- Organizar eventos semanais em vez de mensais
- Variar horários para atingir diferentes públicos
- Oferecer eventos online e presenciais

### 2. Melhorar Divulgação
- Enviar lembretes por email 48h antes
- Usar redes sociais para promover eventos
- Criar cartazes e banners informativos

### 3. Diversificar Tipos de Eventos
- Workshops técnicos
- Palestras inspiracionais
- Atividades de networking
- Competições e desafios

### 4. Gamificar o Sistema de Créditos
- Badges e certificações
- Ranking de alunos
- Prêmios para melhor participação
- Desafios mensais

### 5. Coletar Feedback
- Pesquisas após cada evento
- Sugestões de temas
- Avaliação de horários
- Melhorias contínuas

---
*Sugestões geradas automaticamente pelo Sistema de Presença por QR Code*
`;
}

export default {
  generateFrequencyAnalysis,
  generateImprovementSuggestions,
  generateLowParticipationEventAnalysis,
};
