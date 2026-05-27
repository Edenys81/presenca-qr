// src/tests/db.mock.ts
// Mock database module for tests

export const getEventById = async (id: number) => ({
  id,
  nome: "Test Event",
  data: new Date("2026-05-09"),
  horario: "14:00",
  local: "Sala 101",
  cargaHoraria: 2,
  creditos: 5,
  qrCodeData: JSON.stringify({ id: "test-qr" }),
  qrCodeUrl: "data:image/png;base64,test",
  qrCodeId: "test-qr-123",
  criadoPor: "admin-123",
  ativo: true,
});

export const getStudentById = async (id: number) => ({
  id,
  nome: "Test Student",
  email: "test@example.com",
  matricula: "2024001",
  curso: "Engenharia",
  creditosTotais: 0,
  userId: "test-user-123",
});

export const getAttendanceByStudentAndEvent = async (studentId: number, eventId: number) => null;

export const createAttendance = async (data: any) => ({
  id: 1,
  ...data,
});

export const updateStudent = async (id: number, data: any) => ({
  id,
  ...data,
});

export const createCreditHistory = async (data: any) => ({
  id: 1,
  ...data,
});

export const getCertificateByAttendance = async (attendanceId: number) => null;

export const createCertificate = async (data: any) => ({
  id: 1,
  ...data,
});

export const getCertificateById = async (id: number) => ({
  id,
  certificateUrl: "https://example.com/cert.pdf",
  qrCodeValidacao: "test-validation-code",
});

export const getNotificationsByStudent = async (studentId: number) => [];

export const createNotification = async (data: any) => ({
  id: 1,
  ...data,
});

export const updateNotification = async (id: number, data: any) => ({
  id,
  ...data,
});

export const getAnalysesByType = async (type: string) => [];

export const createAnalysis = async (data: any) => ({
  id: 1,
  ...data,
});

export const getLatestAnalyses = async (limit?: number) => [];

export const getAllEvents = async () => [];

export const getAttendancesByEvent = async (eventId: number) => [];

export const getAttendancesByStudent = async (studentId: number) => [];

export const getAllStudents = async () => [];

export const getStudentByUserId = async (userId: string) => ({
  id: 1,
  nome: "Test Student",
  email: "test@example.com",
  matricula: "2024001",
  curso: "Engenharia",
  creditosTotais: 0,
  userId,
});

export const upsertUser = async (data: any) => ({
  id: 1,
  ...data,
});

export const getUnsentNotifications = async () => [];

export const getAllCertificates = async (studentId: number) => [];

export const getCertificatesByStudent = async (studentId: number) => [];
