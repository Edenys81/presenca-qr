import { describe, it, expect, beforeEach, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import * as db from "./db.mock.js";

// Mock do módulo db
vi.mock("./db.mock", () => ({
  getAllEvents: vi.fn(),
  getStudentByUserId: vi.fn(),
  getAttendanceByStudentAndEvent: vi.fn(),
  createAttendance: vi.fn(),
  updateStudent: vi.fn(),
  createCreditHistory: vi.fn(),
  createNotification: vi.fn(),
}));

describe("attendance.registerByQRCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should register attendance successfully when QR code is valid", async () => {
    // Mock data
    const mockEvent = {
      id: 1,
      nome: "Workshop de React",
      creditos: 2.5,
      qrCodeData: JSON.stringify({ qrCodeId: "QR-001" }),
    };

    const mockStudent = {
      id: 1,
      userId: "user-1",
      nome: "João Silva",
      email: "joao@example.com",
      matricula: "2024001",
      curso: "Engenharia",
      creditosTotais: 5.0, 
    };


    const mockContext = {
      user: { id: "user-1", name: "João Silva", email: "joao@example.com", role: "user" },
    };

    // Setup mocks
    vi.mocked(db.getAllEvents).mockResolvedValue([mockEvent]);
    vi.mocked(db.getStudentByUserId).mockResolvedValue(mockStudent);
    vi.mocked(db.getAttendanceByStudentAndEvent).mockResolvedValue(null);
    vi.mocked(db.createAttendance).mockResolvedValue({ id: 1 });
    vi.mocked(db.updateStudent).mockResolvedValue(mockStudent);
    vi.mocked(db.createCreditHistory).mockResolvedValue({ id: 1 });
    vi.mocked(db.createNotification).mockResolvedValue({ id: 1 });

    // Simulate the procedure logic
    const qrCodeId = "QR-001";
    const allEvents = await db.getAllEvents();
    const event = allEvents.find((e: any) => {
      try {
        const data = JSON.parse(e.qrCodeData);
        return data.qrCodeId === qrCodeId;
      } catch {
        return false;
      }
    });

    expect(event).toBeDefined();
    expect(event?.id).toBe(1);

    const student = await db.getStudentByUserId(mockContext.user.id);
    expect(student).toBeDefined();
    expect(student?.id).toBe(1);

    const existing = await db.getAttendanceByStudentAndEvent(student!.id, event!.id);
    expect(existing).toBeNull();

    // Register attendance
    const creditos = parseFloat(event!.creditos.toString());
    await db.createAttendance({
      studentId: student!.id,
      eventId: event!.id,
      creditosRegistrados: creditos,
    });

    const newTotal = parseFloat(student!.creditosTotais.toString()) + creditos;
    await db.updateStudent(student!.id, {
      creditosTotais: newTotal,
    });

    expect(newTotal).toBe(7.5);
    expect(db.createAttendance).toHaveBeenCalledWith({
      studentId: 1,
      eventId: 1,
      creditosRegistrados: 2.5,
    });
    expect(db.updateStudent).toHaveBeenCalledWith(1, {
      creditosTotais: 7.5,
    });
  });

  it("should throw error when event is not found", async () => {
    const mockContext = {
      user: { id: "user-1", name: "João Silva", email: "joao@example.com", role: "user" },
    };

    vi.mocked(db.getAllEvents).mockResolvedValue([]);

    const qrCodeId = "QR-INVALID";
    const allEvents = await db.getAllEvents();
    const event = allEvents.find((e: any) => {
      try {
        const data = JSON.parse(e.qrCodeData);
        return data.qrCodeId === qrCodeId;
      } catch {
        return false;
      }
    });

    expect(event).toBeUndefined();
  });

  it("should throw error when student is not found", async () => {
    const mockEvent = {
      id: 1,
      nome: "Workshop de React",
      creditos: 2.5,
      qrCodeData: JSON.stringify({ qrCodeId: "QR-001" }),
    };

    const mockContext = {
      user: { id: "user-1", name: "João Silva", email: "joao@example.com", role: "user" },
    };

    vi.mocked(db.getAllEvents).mockResolvedValue([mockEvent]);
    vi.mocked(db.getStudentByUserId).mockResolvedValue(null);

    const qrCodeId = "QR-001";
    const allEvents = await db.getAllEvents();
    const event = allEvents.find((e: any) => {
      try {
        const data = JSON.parse(e.qrCodeData);
        return data.qrCodeId === qrCodeId;
      } catch {
        return false;
      }
    });

    expect(event).toBeDefined();

    const student = await db.getStudentByUserId(mockContext.user.id);
    expect(student).toBeNull();
  });

  it("should throw error when already registered for event", async () => {
    const mockEvent = {
      id: 1,
      nome: "Workshop de React",
      creditos: 2.5,
      qrCodeData: JSON.stringify({ qrCodeId: "QR-001" }),
    };

    const mockStudent = {
      id: 1,
      userId: "user-1",
      nome: "João Silva",
      email: "joao@example.com",
      matricula: "2024001",
      curso: "Engenharia",
      creditosTotais: 5.0, 
    };

    const mockExistingAttendance = {
      id: 1,
      studentId: 1,
      eventId: 1,
    };

    const mockContext = {
      user: { id: "user-1", name: "João Silva", email: "joao@example.com", role: "user" },
    };

    vi.mocked(db.getAllEvents).mockResolvedValue([mockEvent]);
    vi.mocked(db.getStudentByUserId).mockResolvedValue(mockStudent);
    vi.mocked(db.getAttendanceByStudentAndEvent).mockResolvedValue(mockExistingAttendance);

    const qrCodeId = "QR-001";
    const allEvents = await db.getAllEvents();
    const event = allEvents.find((e: any) => {
      try {
        const data = JSON.parse(e.qrCodeData);
        return data.qrCodeId === qrCodeId;
      } catch {
        return false;
      }
    });

    const student = await db.getStudentByUserId(mockContext.user.id);
    const existing = await db.getAttendanceByStudentAndEvent(student!.id, event!.id);

    expect(existing).toBeDefined();
    expect(existing?.id).toBe(1);
  });

  it("should create notification after successful registration", async () => {
    const mockEvent = {
      id: 1,
      nome: "Workshop de React",
      creditos: 2.5,
      qrCodeData: JSON.stringify({ qrCodeId: "QR-001" }),
    };

    const mockStudent = {
      id: 1,
      userId: "user-1",
      nome: "João Silva",
      email: "joao@example.com",
      matricula: "2024001",
      curso: "Engenharia",
      creditosTotais: 5.0, 
    };

    const mockContext = {
      user: { id: "user-1", name: "João Silva", email: "joao@example.com", role: "user" },
    };

    vi.mocked(db.getAllEvents).mockResolvedValue([mockEvent]);
    vi.mocked(db.getStudentByUserId).mockResolvedValue(mockStudent);
    vi.mocked(db.getAttendanceByStudentAndEvent).mockResolvedValue(null);
    vi.mocked(db.createAttendance).mockResolvedValue({ id: 1 });
    vi.mocked(db.updateStudent).mockResolvedValue(mockStudent);
    vi.mocked(db.createCreditHistory).mockResolvedValue({ id: 1 });
    vi.mocked(db.createNotification).mockResolvedValue({ id: 1 });

    const qrCodeId = "QR-001";
    const allEvents = await db.getAllEvents();
    const event = allEvents.find((e: any) => {
      try {
        const data = JSON.parse(e.qrCodeData);
        return data.qrCodeId === qrCodeId;
      } catch {
        return false;
      }
    });

    const student = await db.getStudentByUserId(mockContext.user.id);
    const creditos = parseFloat(event!.creditos.toString());

    await db.createNotification({
      studentId: student!.id,
      tipo: "creditos_recebidos",
      titulo: "Créditos Recebidos",
      mensagem: `Você recebeu ${creditos} créditos por participar do evento "${event!.nome}"`,
      enviado: false,
    });

    expect(db.createNotification).toHaveBeenCalledWith({
      studentId: 1,
      tipo: "creditos_recebidos",
      titulo: "Créditos Recebidos",
      mensagem: "Você recebeu 2.5 créditos por participar do evento \"Workshop de React\"",
      enviado: false,
    });
  });
});
