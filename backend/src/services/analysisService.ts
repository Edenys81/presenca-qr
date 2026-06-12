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

    // Coletar dados de participação com análise temporal
    const participationData = await Promise.all(
      students.map(async (student) => {
        const attendances = await attendanceRepo.getAttendancesByStudent(student.id);
        const credits = parseFloat(student.creditosTotais?.toString() ?? "0");
        
        // Analisar padrão temporal
        const attendancesByMonth: Record<string, number> = {};
        attendances.forEach((att) => {
          const month = new Date(att.timestamp).toISOString().substring(0, 7);
          attendancesByMonth[month] = (attendancesByMonth[month] || 0) + 1;
        });

        return {
          id: student.id,
          name: student.nome,
          course: student.curso,
          totalCredits: credits,
          participations: attendances.length,
          email: student.email,
          recentActivity: attendances.length > 0 
            ? new Date(attendances[attendances.length - 1].timestamp).toLocaleDateString("pt-BR")
            : "Sem participações",
          monthlyPattern: attendancesByMonth,
        };
      })
    );

    // Calcular estatísticas avançadas
    const totalParticipations = participationData.reduce((sum, s) => sum + s.participations, 0);
    const avgParticipationPerStudent = 
      students.length > 0 ? totalParticipations / students.length : 0;
    
    const topStudents = participationData
      .sort((a, b) => b.participations - a.participations)
      .slice(0, 5);
    
    const lowParticipationStudents = participationData
      .filter((s) => s.participations === 0)
      .slice(0, 5);
    
    const moderateParticipationStudents = participationData
      .filter((s) => s.participations > 0 && s.participations < avgParticipationPerStudent)
      .slice(0, 5);

    // Analisar distribuição de créditos
    const totalCreditsDistributed = participationData.reduce((sum, s) => sum + s.totalCredits, 0);
    const avgCreditsPerStudent = totalCreditsDistributed / students.length;
    const creditDistribution = {
      above: participationData.filter(s => s.totalCredits > avgCreditsPerStudent * 1.5).length,
      average: participationData.filter(s => s.totalCredits >= avgCreditsPerStudent * 0.5 && s.totalCredits <= avgCreditsPerStudent * 1.5).length,
      below: participationData.filter(s => s.totalCredits < avgCreditsPerStudent * 0.5).length,
    };

    // Preparar prompt ENRIQUECIDO para LLM
    const prompt = `Você é um analista de dados educacional especializado em análise de participação em eventos acadêmicos. Forneça insights profundos e acionáveis.

CONTEXTO DO SISTEMA:
- Instituição: Faculdade Projeção
- Programa: Tecnologia em Análise e Desenvolvimento de Sistemas
- Objetivo: Aumentar engajamento em eventos acadêmicos através de créditos curriculares

DADOS GERAIS:
- Total de Alunos: ${students.length}
- Total de Eventos Disponíveis: ${events.length}
- Total de Participações Registradas: ${totalParticipations}
- Média de Participações por Aluno: ${avgParticipationPerStudent.toFixed(2)}
- Total de Créditos Distribuídos: ${totalCreditsDistributed.toFixed(2)}
- Média de Créditos por Aluno: ${avgCreditsPerStudent.toFixed(2)}

DISTRIBUIÇÃO DE CRÉDITOS:
- Alunos com Créditos Acima da Média: ${creditDistribution.above} (${((creditDistribution.above / students.length) * 100).toFixed(1)}%)
- Alunos com Créditos na Média: ${creditDistribution.average} (${((creditDistribution.average / students.length) * 100).toFixed(1)}%)
- Alunos com Créditos Abaixo da Média: ${creditDistribution.below} (${((creditDistribution.below / students.length) * 100).toFixed(1)}%)

TOP 5 ALUNOS COM MELHOR PARTICIPAÇÃO (ENGAJADOS):
${topStudents.map((s) => `- ${s.name} (${s.course}): ${s.participations} eventos, ${s.totalCredits.toFixed(2)} créditos, última atividade: ${s.recentActivity}`).join("\n")}

ALUNOS COM PARTICIPAÇÃO MODERADA (POTENCIAL DE CRESCIMENTO):
${moderateParticipationStudents.length > 0 
  ? moderateParticipationStudents.map((s) => `- ${s.name} (${s.course}): ${s.participations} eventos, ${s.totalCredits.toFixed(2)} créditos`).join("\n")
  : "Nenhum aluno nesta categoria"}

ALUNOS SEM PARTICIPAÇÃO (CRÍTICO - REQUEREM INTERVENÇÃO):
${lowParticipationStudents.length > 0 
  ? lowParticipationStudents.map((s) => `- ${s.name} (${s.course})`).join("\n")
  : "Todos os alunos participaram de pelo menos um evento"}

PADRÃO TEMPORAL DE PARTICIPAÇÕES:
${JSON.stringify(participationData.slice(0, 3).map(s => ({ name: s.name, monthlyPattern: s.monthlyPattern })), null, 2)}

ANÁLISE SOLICITADA:
Forneça uma análise estruturada com:

1. **PADRÕES GERAIS DE FREQUÊNCIA**: 
   - Tendências principais de participação
   - Períodos de maior/menor engajamento
   - Comparação com expectativas acadêmicas

2. **SEGMENTAÇÃO DE ALUNOS**:
   - Perfil dos alunos engajados (o que os motiva?)
   - Características dos alunos com baixa participação
   - Oportunidades de transição entre segmentos

3. **ANÁLISE DE RETENÇÃO**:
   - Alunos que mantêm participação consistente
   - Alunos que tiveram queda de engajamento
   - Fatores que podem estar afetando a retenção

4. **DISTRIBUIÇÃO DE CRÉDITOS**:
   - Equidade na distribuição
   - Alunos em risco de não atingir metas de créditos
   - Recomendações de redistribuição

5. **RECOMENDAÇÕES ACIONÁVEIS PARA A SECRETARIA**:
   - 3 ações imediatas (próximos 7 dias)
   - 3 estratégias de médio prazo (próximas 4 semanas)
   - Métricas para acompanhamento

Responda em português de forma clara, estruturada, com dados específicos e recomendações práticas que a secretaria possa implementar imediatamente.`;

    // Chamar LLM
    let analysisContent: string;

    try {
      console.log("[ANALYSIS] 🤖 Chamando LLM para análise de frequência...");
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

      console.log("[ANALYSIS] 📥 Resposta recebida do LLM", {
        model: response.model,
        choices: response.choices.length,
        tokens: response.usage,
      });

      analysisContent =
        typeof response.choices[0]?.message?.content === "string"
          ? response.choices[0].message.content
          : "Análise não disponível";

      console.log("[ANALYSIS] ✅ Análise gerada com sucesso via LLM");
    } catch (llmError) {
      console.error("[ANALYSIS] ❌ ERRO ao chamar LLM:", {
        error: llmError instanceof Error ? llmError.message : String(llmError),
        stack: llmError instanceof Error ? llmError.stack : undefined,
      });
      console.warn("[ANALYSIS] ⚠️ Usando análise simplificada como fallback");

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

    console.log("[ANALYSIS] ✅ Análise de frequência salva no banco");

    // Notificar admin
    await notifyOwner({
      title: "✅ Análise de Frequência Gerada",
      content: `Uma nova análise detalhada sobre padrões de frequência foi gerada. ${students.length} alunos analisados, ${totalParticipations} participações totais, ${topStudents.length} alunos com alta participação identificados.`,
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
    const analyses = await analysisRepo.getLatestAnalyses();

    if (students.length === 0 || events.length === 0) {
      console.warn("[ANALYSIS] Dados insuficientes para gerar sugestões");
      return "Dados insuficientes no sistema para gerar sugestões de melhorias.";
    }

    // Coletar estatísticas avançadas
    let totalParticipations = 0;
    let totalCreditsDistributed = 0;
    const eventStats: Array<{ name: string; participations: number; credits: number; date: Date }> = [];

    for (const student of students) {
      const attendances = await attendanceRepo.getAttendancesByStudent(student.id);
      totalParticipations += attendances.length;
      totalCreditsDistributed += parseFloat(student.creditosTotais?.toString() ?? "0");
    }

    for (const event of events) {
      const attendances = await attendanceRepo.getAttendancesByEvent(event.id);
      eventStats.push({
        name: event.nome,
        participations: attendances.length,
        credits: parseFloat(event.creditos?.toString() ?? "0"),
        date: new Date(event.data),
      });
    }

    const avgParticipationPerStudent =
      students.length > 0 ? totalParticipations / students.length : 0;
    const avgCreditsPerStudent =
      students.length > 0 ? totalCreditsDistributed / students.length : 0;

    // Identificar eventos bem-sucedidos vs mal-sucedidos
    const avgEventParticipation = eventStats.reduce((sum, e) => sum + e.participations, 0) / eventStats.length;
    const successfulEvents = eventStats.filter(e => e.participations > avgEventParticipation).slice(0, 3);
    const underperformingEvents = eventStats.filter(e => e.participations < avgEventParticipation).slice(0, 3);

    // Preparar prompt ENRIQUECIDO para LLM
    const prompt = `Você é um consultor educacional especializado em estratégias de engajamento estudantil e eventos acadêmicos.

CONTEXTO:
- Instituição: Faculdade Projeção
- Programa: Tecnologia em Análise e Desenvolvimento de Sistemas
- Objetivo: Aumentar participação em eventos e engajamento curricular

ESTATÍSTICAS GERAIS DO SISTEMA:
- Total de Alunos: ${students.length}
- Total de Eventos: ${events.length}
- Total de Participações: ${totalParticipations}
- Créditos Distribuídos: ${totalCreditsDistributed.toFixed(2)}
- Média de Participações por Aluno: ${avgParticipationPerStudent.toFixed(2)}
- Média de Créditos por Aluno: ${avgCreditsPerStudent.toFixed(2)}

EVENTOS BEM-SUCEDIDOS (MODELO A REPLICAR):
${successfulEvents.map((e) => `- ${e.name}: ${e.participations} participações, ${e.credits} créditos`).join("\n")}

EVENTOS COM BAIXO DESEMPENHO (REQUEREM AÇÃO):
${underperformingEvents.map((e) => `- ${e.name}: ${e.participations} participações, ${e.credits} créditos`).join("\n")}

ANÁLISES ANTERIORES (CONTEXTO):
${analyses.slice(0, 2).map((a) => `- Tipo: ${a.tipo}, Data: ${new Date(a.createdAt).toLocaleDateString("pt-BR")}`).join("\n")}

SUGESTÕES SOLICITADAS:

1. **5 ESTRATÉGIAS PRÁTICAS IMEDIATAS** (próximos 7 dias):
   - Baseadas nos eventos bem-sucedidos
   - Específicas para aumentar participação
   - Viáveis de implementar rapidamente

2. **ESTRATÉGIAS DE DIVULGAÇÃO MELHORADA**:
   - Canais de comunicação mais eficazes
   - Timing ideal para anúncios
   - Mensagens que ressoam com alunos

3. **TIPOS DE EVENTOS RECOMENDADOS**:
   - Baseado em dados de participação
   - Formatos que funcionam melhor
   - Frequência ideal de eventos

4. **GAMIFICAÇÃO E INCENTIVOS**:
   - Como tornar o sistema de créditos mais atraente
   - Metas intermediárias para alunos
   - Reconhecimento de participação consistente

5. **PLANO DE AÇÃO PARA 30 DIAS**:
   - Semana 1: O que fazer
   - Semana 2-3: Consolidação
   - Semana 4: Avaliação e ajustes
   - Métricas de sucesso

Responda em português, de forma estruturada, com recomendações concretas e viáveis que a secretaria possa implementar. Inclua justificativas baseadas nos dados do sistema.`;

    // Chamar LLM
    let suggestionsContent: string;

    try {
      console.log("[ANALYSIS] 🤖 Chamando LLM para sugestões de melhorias...");
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

      console.log("[ANALYSIS] 📥 Resposta recebida do LLM", {
        model: response.model,
        choices: response.choices.length,
        tokens: response.usage,
      });

      suggestionsContent =
        typeof response.choices[0]?.message?.content === "string"
          ? response.choices[0].message.content
          : "Sugestões não disponíveis";

      console.log("[ANALYSIS] ✅ Sugestões geradas com sucesso via LLM");
    } catch (llmError) {
      console.error("[ANALYSIS] ❌ ERRO ao chamar LLM:", {
        error: llmError instanceof Error ? llmError.message : String(llmError),
        stack: llmError instanceof Error ? llmError.stack : undefined,
      });
      console.warn("[ANALYSIS] ⚠️ Usando sugestões simplificadas como fallback");

      // Sugestões simplificadas como fallback
      suggestionsContent = generateSimplifiedSuggestions(
        students.length,
        events.length,
        avgParticipationPerStudent
      );
    }

    // Salvar sugestões no banco de dados
    const analysis = await analysisRepo.createAnalysis({
      tipo: "sugestoes",
      conteudo: suggestionsContent,
      criadoPor: adminId,
    });

    console.log("[ANALYSIS] ✅ Sugestões de melhorias salvas no banco");

    // Notificar admin
    await notifyOwner({
      title: "💡 Sugestões de Melhorias Geradas",
      content: `Novas sugestões estratégicas foram geradas baseadas na análise do sistema. ${successfulEvents.length} eventos bem-sucedidos identificados como modelo.`,
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
          date: new Date(event.data),
          location: event.local,
          participations: attendances.length,
          credits: parseFloat(event.creditos?.toString() ?? "0"),
          description: event.descricao,
        };
      })
    );

    const lowParticipationEvents = eventStats
      .filter((e) => e.participations < 5)
      .sort((a, b) => a.participations - b.participations);

    if (lowParticipationEvents.length === 0) {
      console.log("[ANALYSIS] Todos os eventos têm boa participação");
      return "Todos os eventos têm boa participação. Parabéns!";
    }

    const avgParticipation = eventStats.reduce((sum, e) => sum + e.participations, 0) / eventStats.length;

    const prompt = `Você é um especialista em eventos acadêmicos e engajamento estudantil.

CONTEXTO:
- Instituição: Faculdade Projeção
- Programa: Tecnologia em Análise e Desenvolvimento de Sistemas

EVENTOS COM BAIXA PARTICIPAÇÃO (ABAIXO DE 5 PARTICIPANTES):
${lowParticipationEvents.map((e) => `
- **${e.name}**
  Data: ${e.date.toLocaleDateString("pt-BR")}
  Local: ${e.location}
  Participações: ${e.participations}
  Créditos: ${e.credits}
  Descrição: ${e.description || "Não informada"}
`).join("\n")}

MÉDIA DE PARTICIPAÇÃO POR EVENTO: ${avgParticipation.toFixed(2)}

ANÁLISE SOLICITADA:

1. **DIAGNÓSTICO**: Por que estes eventos tiveram baixa participação?
   - Fatores possíveis (data, horário, tema, comunicação)
   - Comparação com eventos bem-sucedidos

2. **AÇÕES CORRETIVAS ESPECÍFICAS**: Para cada evento, o que fazer?
   - Se for repetido: como melhorar?
   - Se for único: lições aprendidas

3. **ESTRATÉGIA DE RECUPERAÇÃO**:
   - Como resgatar o interesse nesses temas
   - Sugestões de reformulação
   - Melhor timing para repetição

4. **PREVENÇÃO FUTURA**:
   - Critérios para avaliar viabilidade de novos eventos
   - Checklist pré-evento para garantir sucesso
   - Comunicação ideal para eventos similares

Responda em português, com recomendações específicas e acionáveis para cada evento.`;

    let analysisContent: string;

    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "Você é um especialista em eventos acadêmicos. Forneça análises diagnósticas e recomendações específicas para melhorar participação. Seja prático e acionável.",
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

      console.log("[ANALYSIS] ✅ Análise de eventos com baixa participação gerada com sucesso");
    } catch (llmError) {
      console.error("[ANALYSIS] ❌ ERRO ao chamar LLM:", {
        error: llmError instanceof Error ? llmError.message : String(llmError),
        stack: llmError instanceof Error ? llmError.stack : undefined,
      });
      console.warn("[ANALYSIS] ⚠️ Usando análise simplificada como fallback para eventos");

      analysisContent = `
Eventos com Baixa Participação Identificados:

${lowParticipationEvents.map((e) => `- ${e.name} (${e.date.toLocaleDateString("pt-BR")}): ${e.participations} participações`).join("\n")}

Recomendações:
1. Revisar data/horário dos eventos
2. Melhorar divulgação e comunicação
3. Considerar reformulação do tema ou formato
4. Aumentar incentivo de créditos se apropriado
      `;
    }

    // Salvar análise no banco de dados
    const analysis = await analysisRepo.createAnalysis({
      tipo: "baixa_participacao",
      conteudo: analysisContent,
      criadoPor: adminId,
    });

    console.log("[ANALYSIS] ✅ Análise de eventos com baixa participação salva no banco");

    // Notificar admin
    await notifyOwner({
      title: "⚠️ Análise de Eventos com Baixa Participação",
      content: `${lowParticipationEvents.length} eventos identificados com participação abaixo da média. Recomendações geradas para melhoria.`,
    });

    return analysisContent;
  } catch (error) {
    console.error("[ANALYSIS] ❌ Erro ao gerar análise de eventos com baixa participação:", error);
    throw error;
  }
}

// ============ FALLBACK FUNCTIONS (mantidas para compatibilidade) ============

function generateSimplifiedAnalysis(
  totalStudents: number,
  totalEvents: number,
  totalParticipations: number,
  avgParticipation: number,
  topStudents: any[],
  lowParticipationStudents: any[]
): string {
  return `
ANÁLISE DE FREQUÊNCIA - RESUMO SIMPLIFICADO

Estatísticas Gerais:
- Total de Alunos: ${totalStudents}
- Total de Eventos: ${totalEvents}
- Total de Participações: ${totalParticipations}
- Média por Aluno: ${avgParticipation.toFixed(2)}

Alunos Engajados:
${topStudents.map((s) => `- ${s.name}: ${s.participations} participações`).join("\n")}

Alunos sem Participação:
${lowParticipationStudents.length > 0 
  ? lowParticipationStudents.map((s) => `- ${s.name}`).join("\n")
  : "Nenhum"}

Recomendações:
1. Manter engajamento dos alunos com alta participação
2. Incentivar alunos com baixa participação
3. Diversificar tipos de eventos
  `;
}

function generateSimplifiedSuggestions(
  totalStudents: number,
  totalEvents: number,
  avgParticipation: number
): string {
  return `
SUGESTÕES DE MELHORIAS - RESUMO SIMPLIFICADO

Estatísticas:
- Alunos: ${totalStudents}
- Eventos: ${totalEvents}
- Média de Participação: ${avgParticipation.toFixed(2)}

Sugestões Práticas:
1. Aumentar divulgação de eventos
2. Variar tipos e horários de eventos
3. Implementar gamificação com créditos
4. Criar grupos de interesse específicos
5. Feedback regular aos alunos sobre progresso

Próximos Passos:
- Escolher 2-3 sugestões para implementar
- Medir impacto em 2-4 semanas
- Ajustar conforme necessário
  `;
}

export default {
  generateFrequencyAnalysis,
  generateImprovementSuggestions,
  generateLowParticipationEventAnalysis,
};
