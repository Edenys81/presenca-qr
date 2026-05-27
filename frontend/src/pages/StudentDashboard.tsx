import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Scanner } from "@yudiel/react-qr-scanner";
import { useAuth } from "../auth/AuthProvider";

export default function StudentDashboard() {
  const [qrCodeId, setQrCodeId] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [scanned, setScanned] = useState(false);

  const { refetch } = useAuth();

  const { data: profile, isLoading: loadingProfile } =
    trpc.student.getProfile.useQuery();

  const { data: credits } =
    trpc.student.getTotalCredits.useQuery();

  const { data: attendances } =
    trpc.student.getAttendanceHistory.useQuery();

  const { data: history } =
    trpc.student.getCreditHistory.useQuery();

  const { data: notifications } =
    trpc.notification.getNotifications.useQuery();

  const utils = trpc.useUtils();

  const registerPresence = trpc.attendance.registerByQRCode.useMutation({
    onSuccess: async (data) => {
      alert(`Presença registrada! +${data.creditos} créditos`);

      await utils.student.getTotalCredits.invalidate();
      await utils.student.getAttendanceHistory.invalidate();
      await utils.student.getCreditHistory.invalidate();
      await utils.notification.getNotifications.invalidate();
      setQrCodeId("");
    },
    onError: (err) => {
      alert(err.message);
    },
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      await refetch();
    },
  });

  if (loadingProfile) {
    return (
      <div className="loading-center">
        <div className="loading"></div>
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container" style={{ flexDirection: "column" }}>
      {/* Header */}
      <header className="dashboard-header">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <img src="/images/logo.png" alt="Logo" className="header-logo" />
          <div>
            <h1 className="header-title">Presença</h1>
            <p className="header-subtitle">Área do Aluno</p>
          </div>
        </div>

        <button onClick={() => logoutMutation.mutate()} className="logout-btn">
          Sair
        </button>
      </header>

      {/* Main Content */}
      <main className="dashboard-content">
        {/* Grid: Perfil, Créditos, Notificações */}
        <div className="grid grid-3">
          {/* Perfil */}
          <div className="card">
            <h3 className="card-title">Perfil</h3>
            <div className="card-content">
              <p><strong>Nome:</strong> {profile?.nome}</p>
              <p style={{ marginTop: "8px" }}><strong>Matrícula:</strong> {profile?.matricula}</p>
              <p style={{ marginTop: "8px" }}><strong>Curso:</strong> {profile?.curso || "Não informado"}</p>
            </div>
          </div>

          {/* Créditos */}
          <div className="card-highlight">
            <h3 className="card-title">Créditos Totais</h3>
            <div className="big-number">{credits?.totalCredits || 0}</div>
            <p className="small-text">
              {attendances?.length || 0} presença{attendances && attendances.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Notificações */}
          <div className="card-highlight-blue">
            <h3 className="card-title" style={{ color: "#01579b" }}>Notificações</h3>
            <div className="big-number-blue">
              {notifications?.filter((n) => !n.enviado).length || 0}
            </div>
            <p className="small-text">não lidas</p>
          </div>
        </div>

        {/* Registrar Presença */}
        <div className="card">
          <h3 className="card-title">Registrar Presença (QR Code)</h3>

          <div className="form-group">
            <label className="form-label">Cole o QR Code aqui</label>
            <input
              type="text"
              placeholder="Cole o qrCodeId aqui"
              value={qrCodeId}
              onChange={(e) => setQrCodeId(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="flex-row">
            <button
              disabled={registerPresence.isPending}
              onClick={() => {
                if (!qrCodeId) {
                  alert("Informe o QR Code");
                  return;
                }
                registerPresence.mutate({ qrCodeId });
              }}
              className={`btn btn-primary flex-1 ${registerPresence.isPending ? "btn-disabled" : ""}`}
            >
              {registerPresence.isPending ? "Registrando..." : "Registrar Presença"}
            </button>

            <button
              onClick={() => {
                setScanned(false);
                setCameraOpen(true);
              }}
              className="btn btn-blue flex-1"
            >
              📷 Ler QR Code
            </button>
          </div>

          {/* Camera */}
          {cameraOpen && (
            <div className="camera-section">
              <Scanner
                onScan={(results) => {
                  if (scanned) return;
                  if (!results || results.length === 0) return;

                  try {
                    const raw = results[0].rawValue;
                    const parsed = JSON.parse(raw);

                    if (!parsed.qrCodeId) {
                      throw new Error("QR inválido");
                    }

                    setScanned(true);

                    registerPresence.mutate(
                      { qrCodeId: parsed.qrCodeId },
                      {
                        onSettled: () => {
                          setCameraOpen(false);
                        },
                      }
                    );
                  } catch {
                    alert("QR Code inválido");
                  }
                }}
                onError={(error) => {
                  console.error(error);
                }}
                constraints={{ facingMode: "environment" }}
                styles={{ container: { width: "100%" } }}
              />

              <button
                onClick={() => setCameraOpen(false)}
                className="btn btn-secondary"
                style={{ width: "100%", marginTop: "12px" }}
              >
                Fechar Câmera
              </button>
            </div>
          )}
        </div>

        {/* Presenças Registradas */}
        <div className="card">
          <h3 className="card-title">Presenças Registradas</h3>

          {!attendances ? (
            <p className="empty-state">Carregando...</p>
          ) : attendances.length === 0 ? (
            <p className="empty-state">Nenhuma presença registrada</p>
          ) : (
            <div>
              {attendances.map((att) => (
                <div key={att.id} className="list-item">
                  <div>
                    <p className="list-item-title">{att.event?.nome}</p>
                    <p className="list-item-subtitle">
                      {(() => {
                        console.log("att.timestamp:", att.timestamp);
                        return new Date(att.timestamp).toLocaleString("pt-BR");
                      })()}
                    </p>
                  </div>
                  <div className="list-item-right">
                    <p className="list-item-credits">+{att.creditosRegistrados} créditos</p>
                    <span className="badge badge-active">✓ Confirmada</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Histórico de Créditos */}
        {history && history.length > 0 && (
          <div className="card">
            <h3 className="card-title">Histórico de Créditos</h3>

            <div>
              {history.map((item) => (
                <div key={item.id} className="list-item">
                  <p className="list-item-title">{item.descricao}</p>
                  <p className="list-item-credits">Total: {item.creditosTotaisApos}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notificações */}
        {notifications && notifications.length > 0 && (
          <div className="card">
            <h3 className="card-title">Notificações Recentes</h3>

            <div>
              {notifications.slice(0, 5).map((n) => (
                <div key={n.id} className="notification-item">
                  <p className="notification-item-title">{n.titulo}</p>
                  <p className="notification-item-msg">{n.mensagem}</p>
                  <p className="notification-item-date">
                    {new Date(n.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ background: "rgba(255,255,255,0.7)", padding: "16px", textAlign: "center", fontSize: "13px", color: "#555" }}>
        <p>Sistema Presença QR Code • v1.0</p>
      </footer>
    </div>
  );
}
