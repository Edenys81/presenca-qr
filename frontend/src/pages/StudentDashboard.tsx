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
      await refetch(); // obrigatório
    },
  });

  if (loadingProfile) return <div>Carregando...</div>;

  return (
    <div style={{ padding: 20 }}>
      <h1>Área do Aluno</h1>
      {/* LOGOUT */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => logoutMutation.mutate()}
          style={{
            padding: "6px 12px",
            cursor: "pointer",
            background: "#e11d48",
            color: "white",
            border: "none",
            borderRadius: 4,
          }}
        >
          Sair
        </button>
      </div>
        {/* REGISTRAR PRESENÇA */}
        <div style={{ marginBottom: 20, border: "1px solid #ccc", padding: 10 }}>
        <h2>Registrar Presença (QR Code)</h2>

        <input
            placeholder="Cole o qrCodeId aqui"
            value={qrCodeId}
            onChange={(e) => setQrCodeId(e.target.value)}
        />

        <button
          disabled={registerPresence.isPending}
          onClick={() => {
            if (!qrCodeId) {
              alert("Informe o QR Code");
              return;
            }

            registerPresence.mutate({ qrCodeId });
          }}
        >
          {registerPresence.isPending ? "Registrando..." : "Registrar Presença"}
        </button>

        <button
          onClick={() => {
            setScanned(false);
            setCameraOpen(true);
          }}
        >
          Ler QR Code com Câmera
        </button>
        {cameraOpen && (
          <div style={{ marginTop: 20 }}>
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

            <button onClick={() => setCameraOpen(false)}>
              Fechar câmera
            </button>
          </div>
        )}
        </div>

      {/* PERFIL */}
      <div>
        <h2>Perfil</h2>
        <p><strong>Nome:</strong> {profile?.nome}</p>
        <p><strong>Matrícula:</strong> {profile?.matricula}</p>
        <p><strong>Curso:</strong> {profile?.curso}</p>
      </div>

      {/* CRÉDITOS */}
      <div>
        <h2>Créditos Totais</h2>
        <p>{credits?.totalCredits}</p>
      </div>

      {/* HISTÓRICO DE PRESENÇA */}
      <div>
        <h2>Presenças</h2>

        {!attendances ? (
          <p>Carregando...</p>
        ) : attendances.length === 0 ? (
          <p>Nenhuma presença</p>
        ) : (
          attendances.map((att) => (
            <div key={att.id} style={{ border: "1px solid #ccc", marginBottom: 10, padding: 10 }}>
              <p><strong>Evento:</strong> {att.event?.nome}</p>
              <p><strong>Data:</strong> {new Date(att.timestamp).toLocaleString()}</p>
              <p><strong>Créditos:</strong> {att.creditosRegistrados}</p>
            </div>
          ))
        )}
      </div>

      {/* HISTÓRICO DE CRÉDITOS */}
      <div>
        <h2>Histórico de Créditos</h2>

        {history?.map((item) => (
          <div key={item.id}>
            <p>{item.descricao}</p>
            <p>Total após: {item.creditosTotaisApos}</p>
          </div>
        ))}
      </div>

      {/* NOTIFICAÇÕES */}
      <div>
        <h2>Notificações</h2>

        {notifications?.map((n) => (
          <div key={n.id}>
            <strong>{n.titulo}</strong>
            <p>{n.mensagem}</p>
          </div>
        ))}
      </div>
    </div>
  );
}