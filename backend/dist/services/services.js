import * as studentRepo from "../repositories/studentRepository.js";
import * as notificationRepo from "../repositories/notificationRepository.js";
import * as eventRepo from "../repositories/eventRepository.js";
import * as attendanceRepo from "../repositories/attendanceRepository.js";
import * as analysisRepo from "../repositories/analysisRepository.js";
/**
 * Enviar notificação por email para aluno quando recebe créditos
 */
export async function notifyStudentCreditsReceived(studentId, eventName, credits, totalCredits) {
    const student = await studentRepo.getStudentById(studentId);
    if (!student)
        return;
    // Criar notificação no banco de dados
    await notificationRepo.createNotification({
        studentId,
        tipo: "creditos_recebidos",
        titulo: "Créditos Recebidos",
        mensagem: `Você recebeu ${credits} créditos por participar do evento "${eventName}". Total acumulado: ${totalCredits}`,
        enviado: false,
    });
    // Aqui ainda vai integrar com um serviço de email real
    // Por enquanto, apenas registrar no banco
    console.log(`[EMAIL] Notificação de créditos enviada para ${student.email ?? "email não informado"}`);
}
/**
 * Notificar alunos sobre novo evento criado
 */
export async function notifyStudentsNewEvent(eventName, eventDate) {
    const students = await studentRepo.getAllStudents();
    for (const student of students) {
        await notificationRepo.createNotification({
            studentId: student.id,
            tipo: "novo_evento",
            titulo: "Novo Evento Disponível",
            mensagem: `Um novo evento "${eventName}" foi criado para ${eventDate.toLocaleDateString("pt-BR")}. Registre sua presença!`,
            enviado: false,
        });
    }
    console.log(`[EMAIL] Notificação de novo evento enviada para ${students.length} alunos`);
}
/**
 * Notificar aluno quando certificado fica disponível
 */
export async function notifyStudentCertificateAvailable(studentId, eventName) {
    const student = await studentRepo.getStudentById(studentId);
    if (!student)
        return;
    await notificationRepo.createNotification({
        studentId,
        tipo: "certificado_disponivel",
        titulo: "Certificado Disponível",
        mensagem: `Seu certificado de participação no evento "${eventName}" está disponível para download!`,
        enviado: false,
    });
    console.log(`[EMAIL] Notificação de certificado enviada para ${student.email ?? "email não informado"}`);
}
export async function registerAttendance(studentId, eventId) {
    const existing = await attendanceRepo.getAttendanceByStudentAndEvent(studentId, eventId);
    if (existing) {
        throw new Error("Presença já registrada para este aluno neste evento");
    }
    const student = await studentRepo.getStudentById(studentId);
    const event = await eventRepo.getEventById(eventId);
    if (!student || !event) {
        throw new Error("Aluno ou evento não encontrado");
    }
    const previousCredits = parseFloat(student.creditosTotais ?? "0");
    const eventCredits = parseFloat(event.creditos ?? "0");
    const newTotal = previousCredits + eventCredits;
    await attendanceRepo.createAttendance({
        studentId,
        eventId,
        creditosRegistrados: eventCredits,
    });
    await studentRepo.updateStudent(studentId, {
        creditosTotais: newTotal.toString(),
    });
    return {
        message: "Presença registrada com sucesso",
        totalCreditos: newTotal,
    };
}
/**
 * Gerar análises sobre frequência de alunos usando LLM
 */
export async function generateFrequencyAnalysis(adminId) {
    try {
        const students = await studentRepo.getAllStudents();
        const events = await eventRepo.getAllEvents();
        // Coletar dados de participação
        const participationData = await Promise.all(students.map(async (student) => {
            const attendances = await attendanceRepo.getAttendancesByStudent(student.id);
            return {
                name: student.nome,
                course: student.curso,
                totalCredits: parseFloat(student.creditosTotais ?? "0"),
                participations: attendances.length,
            };
        }));
        // Preparar prompt para LLM
        const prompt = `Analise os seguintes dados de participação de alunos em eventos acadêmicos e gere insights sobre padrões de frequência:

Dados de Participação:
${JSON.stringify(participationData, null, 2)}

Total de Eventos Disponíveis: ${events.length}

Por favor, forneça:
1. Padrões gerais de frequência
2. Alunos com melhor e pior participação
3. Sugestões de melhorias para aumentar a participação
4. Recomendações para a secretaria

Responda em português de forma clara e estruturada.`;
        /*
            const response = await invokeLLM({
              messages: [
                {
                  role: "system",
                  content:
                    "Você é um analista de dados educacional especializado em análise de participação em eventos acadêmicos.",
                },
                {
                  role: "user",
                  content: prompt,
                },
              ],
            });
        
            const analysisContent =
              typeof response.choices[0]?.message?.content === "string"
                ? response.choices[0].message.content
                : "Análise não disponível";
        */
        const analysisContent = `
    [ANÁLISE SIMULADA]

    Total de alunos: ${students.length}
    Total de eventos: ${events.length}

    Resumo:
    - Sistema funcionando corretamente
    - Coleta de dados operacional
    - Integração com banco OK

    (LLM desativado para testes)
    `;
        // Salvar análise no banco de dados
        await analysisRepo.createAnalysis({
            tipo: "frequencia",
            conteudo: analysisContent,
            criadoPor: adminId
        });
        /* Notificar secretaria
        await notifyOwner({
          title: "Análise de Frequência Gerada",
          content: `Uma nova análise sobre padrões de frequência de alunos foi gerada. Acesse o painel administrativo para visualizar.`,
        }); */
        return analysisContent;
    }
    catch (error) {
        console.error("[LLM] Erro ao gerar análise de frequência:", error);
        throw error;
    }
}
/**
 * Gerar sugestões de melhorias usando LLM
 */
export async function generateImprovementSuggestions(adminId) {
    try {
        const students = await studentRepo.getAllStudents();
        const events = await eventRepo.getAllEvents();
        const analyses = await analysisRepo.getLatestAnalyses();
        // Coletar estatísticas
        let totalParticipations = 0;
        let totalCreditsDistributed = 0;
        for (const student of students) {
            totalParticipations += (await attendanceRepo.getAttendancesByStudent(student.id)).length;
            totalCreditsDistributed += parseFloat(student.creditosTotais ?? "0");
        }
        const avgParticipationPerStudent = students.length > 0 ? totalParticipations / students.length : 0;
        const prompt = `Baseado nos seguintes dados do sistema de eventos acadêmicos, gere sugestões de melhorias:

Estatísticas Gerais:
- Total de Alunos: ${students.length}
- Total de Eventos: ${events.length}
- Total de Participações: ${totalParticipations}
- Créditos Distribuídos: ${totalCreditsDistributed}
- Média de Participações por Aluno: ${avgParticipationPerStudent.toFixed(2)}

Análises Anteriores:
${analyses.slice(0, 3).map((a) => a.conteudo).join("\n---\n")}

Por favor, gere:
1. 5 sugestões práticas para aumentar a participação
2. Estratégias para melhorar a divulgação de eventos
3. Recomendações de tipos de eventos mais atraentes
4. Propostas para gamificação do sistema de créditos

Responda em português de forma clara e acionável.`;
        /*
            const response = await invokeLLM({
              messages: [
                {
                  role: "system",
                  content:
                    "Você é um consultor educacional especializado em engajamento de alunos em atividades acadêmicas.",
                },
                {
                  role: "user",
                  content: prompt,
                },
              ],
            });
        
            const suggestionsContent =
              typeof response.choices[0]?.message?.content === "string"
                ? response.choices[0].message.content
                : "Sugestões não disponíveis";
        */
        const suggestionsContent = `
    [SUGESTÕES SIMULADAS]

    1. Melhorar divulgação dos eventos
    2. Criar sistema de ranking de participação
    3. Oferecer bônus por frequência
    4. Enviar notificações automáticas
    5. Criar eventos mais curtos e objetivos

    (LLM desativado para testes)
    `;
        // Salvar sugestões no banco de dados
        await analysisRepo.createAnalysis({
            tipo: "sugestoes",
            conteudo: suggestionsContent,
            criadoPor: adminId
        });
        // Notificar secretaria
        console.log("Notificação simulada");
        /*
        await notifyOwner({
          title: "Sugestões de Melhorias Geradas",
          content: `Novas sugestões para melhorar a participação dos alunos foram geradas. Acesse o painel administrativo para visualizar.`,
        });
        */
        return suggestionsContent;
    }
    catch (error) {
        console.error("[LLM] Erro ao gerar sugestões de melhorias:", error);
        throw error;
    }
}
/**
 * Enviar notificações pendentes (chamado periodicamente)
 */
export async function sendPendingNotifications() {
    try {
        const pendingNotifications = await notificationRepo.getUnsentNotifications();
        for (const notification of pendingNotifications) {
            const student = await studentRepo.getStudentById(notification.studentId);
            if (!student)
                continue;
            // Aqui você integraria com um serviço de email real
            // Por enquanto, apenas marcamos como enviado
            console.log(`[EMAIL] Enviando: ${notification.titulo} para ${student.email ?? "email não informado"}`);
            await notificationRepo.updateNotification(notification.id, {
                enviado: true,
                dataEnvio: new Date(),
            });
        }
        console.log(`[NOTIFICATIONS] ${pendingNotifications.length} notificações enviadas`);
    }
    catch (error) {
        console.error("[NOTIFICATIONS] Erro ao enviar notificações:", error);
    }
}
