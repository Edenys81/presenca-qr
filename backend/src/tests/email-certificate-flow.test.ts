import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Carregar .env ANTES de qualquer outra coisa
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { describe, it, expect, beforeEach, vi } from "vitest";
import * as emailService from "../services/emailService.js";
import * as db from "../database/db.js";
import * as certificates from "../certificates/certificates.js";

// Mock dos módulos
vi.mock("../database/db.js");
vi.mock("../certificates/certificates.js");

describe("Certificate Generation with Email Notification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it(
    "should generate certificate and send email notification",
    async () => {
      // Dados de teste
      const studentId = 4;
      const eventId = 10;
      const attendanceId = 11;
      const studentEmail = "eddie81dev@gmail.com";
      const studentName = "Édenys Carvalho";
      const eventName = "Teste email e certificados";

      // Mock do certificado gerado - com validationCode correto
      const mockCertificate = {
        certificateUrl: "/storage/certificates/4-10-1779145090588.pdf",
        validationCode: "6431b4f1-0b03-4b75-8eb4-b231404e2aac",
      };

      // Mock das funções de banco de dados
      vi.mocked(db.getStudentById).mockResolvedValue({
        id: studentId,
        nome: studentName,
        email: studentEmail,
        matricula: "MAT-4",
        curso: "Engenharia",
        creditosTotais: "10.00",
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(db.getEventById).mockResolvedValue({
        id: eventId,
        nome: eventName,
        descricao: "Teste",
        data: new Date(),
        horario: "14:00",
        local: "Sala 101",
        cargaHoraria: "2.00",
        creditos: "1.00",
        qrCodeData: "{}",
        qrCodeUrl: "https://example.com/qr.png",
        qrCodeId: "QR-TEST-123",
        ativo: true,
        criadoPor: 1,
        createdAt: new Date( ),
        updatedAt: new Date(),
      });

      vi.mocked(certificates.generateCertificatePDF).mockResolvedValue(
        mockCertificate as any
      );

      // Teste de envio de email
      const emailResult = await emailService.sendCertificateNotification(
        studentEmail,
        studentName,
        eventName,
        mockCertificate.certificateUrl
      );

      expect(emailResult).toBe(true);
    },
    
  );

  it(
    "should send attendance notification email",
    async () => {
      const studentEmail = "eddie81dev@gmail.com";
      const studentName = "Édenys Carvalho";
      const eventName = "Teste email e certificados";
      const credits = 1.0;
      const totalCredits = 10.0;

      const result = await emailService.sendAttendanceNotification(
        studentEmail,
        studentName,
        eventName,
        credits,
        totalCredits
      );

      expect(result).toBe(true);
    },
    
  );

  it(
    "should test email connection",
    async () => {
      const result = await emailService.testEmailConnection();
      expect(result).toBe(true);
    },
    
  );

  it(
    "should send generic notification email",
    async () => {
      const result = await emailService.sendGenericNotification(
        "eddie81dev@gmail.com",
        "Édenys Carvalho",
        "Teste de Notificação",
        "Esta é uma mensagem de teste",
        "https://example.com",
        "Clique aqui"
       );

      expect(result).toBe(true);
    },
    
  );
});
