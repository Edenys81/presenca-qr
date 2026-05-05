import { useState } from "react";
import { trpc } from "../lib/trpc";
import { useAuth } from "../auth/AuthProvider";

export default function AdminDashboard() {
  const { refetch } = useAuth();

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      refetch(); // atualiza sessão do AuthProvider

      // força estado global consistente antes de sair
      window.location.href = "/";
    },
  });

  const {
    data: events,
    isLoading,
    error,
    refetch: refetchEvents
  } = trpc.event.listAll.useQuery();

  const createEvent = trpc.event.create.useMutation({
    onSuccess: () => {
      alert("Evento criado!");
      refetchEvents();
    },
  });

  const updateEvent = trpc.event.update.useMutation({
    onSuccess: () => {
      refetchEvents();
    },
  });

  const [form, setForm] = useState({
    nome: "",
    local: "",
    data: "",
    horario: "",
    cargaHoraria: 1,
    creditos: 1,
  });

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

  if (isLoading) return <div>Carregando...</div>;
  if (error) return <div>Erro ao carregar eventos</div>;

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Painel Administrativo</h1>

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

      {/* FORM CRIAR EVENTO */}
      <div style={{ border: "1px solid #ccc", padding: 10, marginBottom: 20 }}>
        <h2>Criar Evento</h2>

        <input
          placeholder="Nome"
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
        />
        <br />

        <input
          type="date"
          onChange={(e) => setForm({ ...form, data: e.target.value })}
        />
        <br />

        <input
          type="time"
          onChange={(e) => setForm({ ...form, horario: e.target.value })}
        />
        <br />

        <input
          placeholder="Local"
          onChange={(e) => setForm({ ...form, local: e.target.value })}
        />
        <br />

        <input
          type="number"
          placeholder="Carga Horária"
          onChange={(e) =>
            setForm({ ...form, cargaHoraria: Number(e.target.value) })
          }
        />
        <br />

        <input
          type="number"
          placeholder="Créditos"
          onChange={(e) =>
            setForm({ ...form, creditos: Number(e.target.value) })
          }
        />
        <br />

        <button onClick={handleCreate}>Criar Evento</button>
      </div>

      {/* LISTA DE EVENTOS */}
      <h2>Eventos</h2>

      {events?.length === 0 && <p>Nenhum evento cadastrado</p>}

      {events?.map((event) => (
        <div
          key={event.id}
          style={{
            border: "1px solid #ccc",
            padding: 10,
            marginBottom: 10,
          }}
        >
          <strong>{event.nome}</strong>

          <p>Data: {new Date(event.data).toLocaleDateString()}</p>
          <p>Local: {event.local}</p>
          <p>Créditos: {event.creditos}</p>
          <p>Status: {event.ativo ? "Ativo" : "Inativo"}</p>

          {/* QR CODE */}
          {event.qrCodeUrl && (
            <img
              src={event.qrCodeUrl}
              alt="QR Code"
              style={{ width: 100, marginTop: 10 }}
            />
          )}

          {/* AÇÕES */}
          <div style={{ marginTop: 10 }}>
            <button
              onClick={() =>
                updateEvent.mutate({
                  id: event.id,
                  ativo: !event.ativo,
                })
              }
            >
              {event.ativo ? "Desativar" : "Ativar"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}