import { useEffect, useState } from "react";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";
import { useAuth } from "../auth/AuthProvider";

export default function AdminDashboard() {
  const { refetch } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"dashboard" | "eventos" | "alunos">("dashboard");
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showStudentModal, setShowStudentModal] = useState(false);

  type Analysis = {
    id: number;
    tipo: string;
    conteudo: string;
  };
  const [analyses, setAnalyses] = useState<Analysis[]>([]);

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      refetch();
      window.location.href = "/";
    },
  });

  const {
    data: events,
    isLoading,
    error,
    refetch: refetchEvents,
  } = trpc.event.listAll.useQuery();

  const { data: stats } = trpc.admin.getDashboardStats.useQuery();
  const { data: students, isLoading: loadingStudents } = trpc.admin.getAllStudents.useQuery();

  const createEvent = trpc.event.create.useMutation({
    onSuccess: () => {
      alert("Evento criado!");
      refetchEvents();
      setForm({
        nome: "",
        local: "",
        data: "",
        horario: "",
        cargaHoraria: 1,
        creditos: 1,
      });
    },
  });



  const deleteEvent = trpc.event.delete.useMutation({
    onSuccess: () => {
      alert("Evento deletado!");
      refetchEvents();
    },
    onError: (err: any) => {
      alert(`Erro: ${err.message}`);
    },
  });

  const {
    data: recentAnalyses,
    refetch: refetchAnalyses,
  } = trpc.analysis.getAllAnalyses.useQuery();

  const generateFrequencyAnalysisMutation = trpc.analysis.generateFrequencyAnalysis.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("✅ Análise de frequência gerada!");
        refetchAnalyses();
      }
    },
    onError: () => {
      toast.error("❌ Erro ao gerar análise");
    }
  });

  const generateFrequencyAnalysis = async () => {
    setIsGeneratingAnalysis(true);
    try {
      await generateFrequencyAnalysisMutation.mutateAsync();
    } finally {
      setIsGeneratingAnalysis(false);
    }
  };

  const generateImprovementSuggestionsMutation = trpc.analysis.generateImprovementSuggestions.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("✅ Sugestões geradas!");
        refetchAnalyses();
      }
    },
    onError: () => {
      toast.error("❌ Erro ao gerar análise");
    }
  });

  const generateImprovementSuggestions = async () => {
    setIsGeneratingAnalysis(true);
    try {
      await generateImprovementSuggestionsMutation.mutateAsync();
    } finally {
      setIsGeneratingAnalysis(false);
    }
  };

  const generateLowParticipationAnalysisMutation =
    trpc.analysis.generateLowParticipationAnalysis.useMutation({
      onSuccess: (result) => {
        if (result.success) {
          toast.success("✅ Análise de baixa participação gerada!");
          refetchAnalyses();
        }
      },
      onError: () => {
        toast.error("❌ Erro ao gerar análise");
      },
    });

  const generateLowParticipationAnalysis = async () => {
    setIsGeneratingAnalysis(true);
    try {
      await generateLowParticipationAnalysisMutation.mutateAsync();
    } finally {
      setIsGeneratingAnalysis(false);
    }
  };

  const [form, setForm] = useState({
    nome: "",
    local: "",
    data: "",
    horario: "",
    cargaHoraria: 1,
    creditos: 1,
  });

  useEffect(() => {
    if (recentAnalyses) {
      setAnalyses(recentAnalyses);
    }
  }, [recentAnalyses]);

  const handleCreate = () => {
    if (!form.nome || !form.data || !form.horario || !form.local) {
      alert("Preencha todos os campos");
      return;
    }

    const dateTime = new Date(`${form.data}T${form.horario}`);

    createEvent.mutate({
      ...form,
      data: dateTime,
    });
  };

  if (isLoading) {
    return (
      <div className="loading-center">
        <div className="loading"></div>
        <p>Carregando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="loading-center">
        <p style={{ color: "#c62828", fontWeight: "bold" }}>Erro ao carregar eventos</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      {sidebarOpen && (
        <aside className="sidebar">
          {/* Logo */}
          <div className="sidebar-logo">
            <img src="/images/logo.png" alt="Logo" />
            <div>
              <p className="sidebar-logo-text">Presença</p>
              <p className="sidebar-logo-sub">Admin</p>
            </div>
          </div>

          {/* Menu */}
          <ul className="sidebar-menu">
            <li>
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`sidebar-menu-btn ${activeTab === "dashboard" ? "active" : ""}`}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "12px 16px",
                  background: activeTab === "dashboard" ? "#1b5e20" : "transparent",
                  color: activeTab === "dashboard" ? "white" : "#333",
                  border: "none",
                  borderRadius: "6px",
                  textAlign: "left",
                  cursor: "pointer",
                  fontSize: "14px",
                  transition: "all 0.3s ease",
                }}
              >
                📊 Dashboard
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab("eventos")}
                className={`sidebar-menu-btn ${activeTab === "eventos" ? "active" : ""}`}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "12px 16px",
                  background: activeTab === "eventos" ? "#1b5e20" : "transparent",
                  color: activeTab === "eventos" ? "white" : "#333",
                  border: "none",
                  borderRadius: "6px",
                  textAlign: "left",
                  cursor: "pointer",
                  fontSize: "14px",
                  transition: "all 0.3s ease",
                }}
              >
                📅 Eventos
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab("alunos")}
                className={`sidebar-menu-btn ${activeTab === "alunos" ? "active" : ""}`}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "12px 16px",
                  background: activeTab === "alunos" ? "#1b5e20" : "transparent",
                  color: activeTab === "alunos" ? "white" : "#333",
                  border: "none",
                  borderRadius: "6px",
                  textAlign: "left",
                  cursor: "pointer",
                  fontSize: "14px",
                  transition: "all 0.3s ease",
                }}
              >
                👥 Alunos
              </button>
            </li>
          </ul>

          {/* Logout */}
          <div style={{ marginTop: "auto", paddingTop: "24px" }}>
            <button
              onClick={() => logoutMutation.mutate()}
              className="btn btn-danger"
              style={{ width: "100%" }}
            >
              Sair
            </button>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <div className="dashboard-content">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="btn btn-secondary"
              style={{ padding: "6px 10px" }}
            >
              {sidebarOpen ? "◀" : "▶"}
            </button>
            <h2 className="page-title">Painel Administrativo</h2>
          </div>
        </div>

        {/* ============ ABA DASHBOARD ============ */}
        {activeTab === "dashboard" && (
          <>
            {/* Stats */}
            <div className="grid grid-3" style={{ marginBottom: "24px" }}>
              <div className="card-highlight">
                <h3 className="card-title">Total de Alunos</h3>
                <div className="big-number">{stats?.totalStudents || 0}</div>
                <p className="small-text">Cadastrados no sistema</p>
              </div>

              <div className="card-highlight">
                <h3 className="card-title">Total de Eventos</h3>
                <div className="big-number">{stats?.totalEvents || 0}</div>
                <p className="small-text">{stats?.activeEvents || 0} ativos</p>
              </div>

              <div className="card-highlight">
                <h3 className="card-title">Créditos Distribuídos</h3>
                <div className="big-number">{stats?.totalCreditsDistributed || 0}</div>
                <p className="small-text">No total</p>
              </div>
            </div>

            {/* Criar Evento */}
            <div className="card">
              <h3 className="card-title">Criar Novo Evento</h3>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Nome do Evento</label>
                  <input
                    type="text"
                    placeholder="Ex: Workshop de React"
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Local</label>
                  <input
                    type="text"
                    placeholder="Ex: Auditório Principal"
                    value={form.local}
                    onChange={(e) => setForm({ ...form, local: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Data</label>
                  <input
                    type="date"
                    value={form.data}
                    onChange={(e) => setForm({ ...form, data: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Horário</label>
                  <input
                    type="time"
                    value={form.horario}
                    onChange={(e) => setForm({ ...form, horario: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Carga Horária (horas)</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={form.cargaHoraria}
                    onChange={(e) =>
                      setForm({ ...form, cargaHoraria: Number(e.target.value) })
                    }
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Créditos</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={form.creditos}
                    onChange={(e) =>
                      setForm({ ...form, creditos: Number(e.target.value) })
                    }
                    className="form-input"
                  />
                </div>
              </div>

              <button
                onClick={handleCreate}
                disabled={createEvent.isPending}
                className={`btn btn-primary ${createEvent.isPending ? "btn-disabled" : ""}`}
              >
                {createEvent.isPending ? "Criando..." : "Criar Evento"}
              </button>
            </div>

            {/* Análises com IA */}
            <div className="card">
              <div className="card-title">🤖 Análises com IA</div>
              <div className="card-content">
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "15px" }}>
                  <button
                    className="btn btn-primary"
                    onClick={generateFrequencyAnalysis}
                    disabled={isGeneratingAnalysis}
                  >
                    {isGeneratingAnalysis ? "Gerando..." : "📊 Análise de Frequência"}
                  </button>

                  <button
                    className="btn btn-primary"
                    onClick={generateImprovementSuggestions}
                    disabled={isGeneratingAnalysis}
                  >
                    {isGeneratingAnalysis ? "Gerando..." : "💡 Sugestões de Melhoria"}
                  </button>

                  <button
                    className="btn btn-primary"
                    onClick={generateLowParticipationAnalysis}
                    disabled={isGeneratingAnalysis}
                  >
                    {isGeneratingAnalysis ? "Gerando..." : "⚠️ Baixa Participação"}
                  </button>
                </div>

                {analyses && analyses.length > 0 && (
                  <div style={{ marginTop: "20px" }}>
                    <h4 style={{ color: "#1b5e20", marginBottom: "12px" }}>Relatórios Recentes:</h4>
                    {analyses.slice(0, 3).map((analysis) => (
                      <div key={analysis.id} className="card" style={{ marginBottom: "12px", background: "#f5f5f5", maxHeight: "300px", overflowY: "auto" }}>
                        <p style={{ fontWeight: "bold", color: "#1b5e20", margin: "0 0 8px 0" }}>
                          {analysis.tipo}
                        </p>
                        <p style={{ color: "#555", margin: "0", fontSize: "13px", lineHeight: "1.5", whiteSpace: "pre-wrap", wordWrap: "break-word" }}>
                          {analysis.conteudo}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ============ ABA EVENTOS ============ */}
        {activeTab === "eventos" && (
          <>
            {/* Criar Evento */}
            <div className="card">
              <h3 className="card-title">Criar Novo Evento</h3>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Nome do Evento</label>
                  <input
                    type="text"
                    placeholder="Ex: Workshop de React"
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Local</label>
                  <input
                    type="text"
                    placeholder="Ex: Auditório Principal"
                    value={form.local}
                    onChange={(e) => setForm({ ...form, local: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Data</label>
                  <input
                    type="date"
                    value={form.data}
                    onChange={(e) => setForm({ ...form, data: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Horário</label>
                  <input
                    type="time"
                    value={form.horario}
                    onChange={(e) => setForm({ ...form, horario: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Carga Horária (horas)</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={form.cargaHoraria}
                    onChange={(e) =>
                      setForm({ ...form, cargaHoraria: Number(e.target.value) })
                    }
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Créditos</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={form.creditos}
                    onChange={(e) =>
                      setForm({ ...form, creditos: Number(e.target.value) })
                    }
                    className="form-input"
                  />
                </div>
              </div>

              <button
                onClick={handleCreate}
                disabled={createEvent.isPending}
                className={`btn btn-primary ${createEvent.isPending ? "btn-disabled" : ""}`}
              >
                {createEvent.isPending ? "Criando..." : "Criar Evento"}
              </button>
            </div>

            {/* Lista de Eventos */}
            <div className="card">
              <h3 className="card-title">Lista de Eventos</h3>

              {!events ? (
                <p className="empty-state">Carregando...</p>
              ) : events.length === 0 ? (
                <p className="empty-state">Nenhum evento cadastrado</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>Data</th>
                        <th>Local</th>
                        <th>Créditos</th>
                        <th>Status</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((event: any) => (
                        <tr key={event.id}>
                          <td>{event.nome}</td>
                          <td>{new Date(event.data).toLocaleDateString("pt-BR")}</td>
                          <td>{event.local}</td>
                          <td>{event.creditos}</td>
                          <td>{event.ativo ? "Ativo" : "Inativo"}</td>
                          <td>
                            <button
                              onClick={() => deleteEvent.mutate({ id: event.id })}
                              style={{
                                padding: "4px 8px",
                                backgroundColor: "#ffcdd2",
                                color: "#c62828",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "12px"
                              }}
                            >
                              🗑️ Deletar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ============ ABA ALUNOS ============ */}
        {activeTab === "alunos" && (
          <div className="card">
            <h3 className="card-title">Lista de Alunos</h3>

            {loadingStudents ? (
              <div style={{ textAlign: "center", padding: "24px" }}>
                <div className="loading"></div>
                <p style={{ color: "#666", marginTop: "16px" }}>Carregando alunos...</p>
              </div>
            ) : students && students.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Email</th>
                      <th>Matrícula</th>
                      <th>Curso</th>
                      <th>Créditos</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student: any) => (
                      <tr key={student.id}>
                        <td>{student.nome}</td>
                        <td>{student.email}</td>
                        <td>{student.matricula}</td>
                        <td>{student.curso}</td>
                        <td>{student.creditosTotais || 0}</td>
                        <td>
                          <button
                            onClick={() => {
                              setSelectedStudent(student);
                              setShowStudentModal(true);
                            }}
                            style={{
                              padding: "4px 8px",
                              backgroundColor: "#c8e6c9",
                              color: "#1b5e20",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "12px"
                            }}
                          >
                            👁️ Detalhes
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty-state">Nenhum aluno registrado</p>
            )}
          </div>
        )}
      </div>

      {/* Modal de Detalhes do Aluno */}
      {showStudentModal && selectedStudent && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowStudentModal(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "8px",
              padding: "24px",
              maxWidth: "500px",
              width: "90%",
              maxHeight: "80vh",
              overflowY: "auto",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ color: "#1b5e20", marginTop: 0 }}>Detalhes do Aluno</h2>

            <div style={{ marginBottom: "16px" }}>
              <p style={{ fontSize: "12px", color: "#999", margin: "0 0 4px 0" }}>Nome</p>
              <p style={{ fontSize: "16px", fontWeight: "bold", color: "#333", margin: 0 }}>
                {selectedStudent.nome}
              </p>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <p style={{ fontSize: "12px", color: "#999", margin: "0 0 4px 0" }}>Email</p>
              <p style={{ fontSize: "14px", color: "#333", margin: 0 }}>
                {selectedStudent.email}
              </p>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <p style={{ fontSize: "12px", color: "#999", margin: "0 0 4px 0" }}>Matrícula</p>
              <p style={{ fontSize: "14px", color: "#333", margin: 0 }}>
                {selectedStudent.matricula}
              </p>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <p style={{ fontSize: "12px", color: "#999", margin: "0 0 4px 0" }}>Curso</p>
              <p style={{ fontSize: "14px", color: "#333", margin: 0 }}>
                {selectedStudent.curso}
              </p>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <p style={{ fontSize: "12px", color: "#999", margin: "0 0 4px 0" }}>Créditos Totais</p>
              <p style={{ fontSize: "16px", fontWeight: "bold", color: "#1b5e20", margin: 0 }}>
                {selectedStudent.creditosTotais || 0}
              </p>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <p style={{ fontSize: "12px", color: "#999", margin: "0 0 4px 0" }}>Presenças Registradas</p>
              <p style={{ fontSize: "14px", color: "#333", margin: 0 }}>
                {selectedStudent.presencasRegistradas || 0}
              </p>
            </div>

            <button
              onClick={() => setShowStudentModal(false)}
              className="btn btn-primary"
              style={{ width: "100%", marginTop: "20px" }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
