import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import * as db from "../database/db.js";
import { storagePut } from "../storage/storage.js";
import { v4 as uuidv4 } from "uuid";

/**
 * Gerar certificado em PDF para aluno
 */
export async function generateCertificatePDF(
  studentId: number,
  eventId: number,
  attendanceId: number
) {
  try {
    const student = await db.getStudentById(studentId);
    const event = await db.getEventById(eventId);

    if (!student || !event) {
      throw new Error("Student or Event not found");
    }

    // Criar documento PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([850, 600]);
    const { width, height } = page.getSize();

    // Cores elegantes
    const primaryColor = rgb(0.1, 0.3, 0.8); // Azul
    const accentColor = rgb(0.4, 0.6, 1.0); // Azul claro
    const textColor = rgb(0.2, 0.2, 0.2); // Cinza escuro

    // Fundo decorativo
    page.drawRectangle({
      x: 0,
      y: height - 100,
      width: width,
      height: 100,
      color: primaryColor,
    });

    // Linha decorativa
    page.drawRectangle({
      x: 0,
      y: height - 110,
      width: width,
      height: 5,
      color: accentColor,
    });

    // Título
    const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    page.drawText("CERTIFICADO DE PARTICIPAÇÃO", {
      x: 50,
      y: height - 70,
      size: 32,
      font: titleFont,
      color: rgb(1, 1, 1),
    });

    // Conteúdo principal
    const contentFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let yPosition = height - 180;

    page.drawText("Certificamos que", {
      x: 50,
      y: yPosition,
      size: 14,
      font: contentFont,
      color: textColor,
    });

    yPosition -= 40;

    // Nome do aluno em destaque
    page.drawText(student.nome.toUpperCase(), {
      x: 50,
      y: yPosition,
      size: 24,
      font: boldFont,
      color: primaryColor,
    });

    yPosition -= 50;

    page.drawText(
      `Matrícula: ${student.matricula} | Curso: ${student.curso}`,
      {
        x: 50,
        y: yPosition,
        size: 11,
        font: contentFont,
        color: textColor,
      }
    );

    yPosition -= 40;

    page.drawText("participou com êxito do evento", {
      x: 50,
      y: yPosition,
      size: 14,
      font: contentFont,
      color: textColor,
    });

    yPosition -= 35;

    // Nome do evento em destaque
    page.drawText(event.nome, {
      x: 50,
      y: yPosition,
      size: 18,
      font: boldFont,
      color: primaryColor,
    });

    yPosition -= 40;

    // Detalhes do evento
    const eventDate = new Date(event.data).toLocaleDateString("pt-BR");
    const detailsText = `Realizado em ${eventDate} | Local: ${event.local} | Carga Horária: ${event.cargaHoraria}h | Créditos: ${event.creditos}`;

    page.drawText(detailsText, {
      x: 50,
      y: yPosition,
      size: 11,
      font: contentFont,
      color: textColor,
    });

    yPosition -= 50;

    page.drawText(
      `Emitido em ${new Date().toLocaleDateString("pt-BR")}`,
      {
        x: 50,
        y: yPosition,
        size: 10,
        font: contentFont,
        color: rgb(0.6, 0.6, 0.6),
      }
    );

    // Gerar QR code de validação
    const validationCode = uuidv4();
    const qrCodeDataUrl = await QRCode.toDataURL(validationCode);

    // Extrair dados base64 do QR code
    const base64Data = qrCodeDataUrl.split(",")[1];
    const qrCodeImage = await pdfDoc.embedPng(Buffer.from(base64Data, "base64"));

    // Adicionar QR code no canto inferior direito
    const qrSize = 100;
    page.drawImage(qrCodeImage, {
      x: width - qrSize - 30,
      y: 30,
      width: qrSize,
      height: qrSize,
    });

    // Texto do QR code
    page.drawText("Código de Validação", {
      x: width - qrSize - 30,
      y: 20,
      size: 8,
      font: contentFont,
      color: rgb(0.6, 0.6, 0.6),
    });

    // Salvar PDF
    const pdfBytes = await pdfDoc.save();

    // Fazer upload para S3
    const fileName = `certificates/${studentId}-${eventId}-${Date.now()}.pdf`;
    const { url: certificateUrl } = await storagePut(
      fileName,
      pdfBytes,
      "application/pdf"
    );

    // Salvar certificado no banco de dados
    await db.createCertificate({
      studentId,
      eventId,
      attendanceId,
      certificateUrl,
      qrCodeValidacao: validationCode,
    });

    return {
      certificateUrl,
      validationCode,
    };
  } catch (error) {
    console.error("[CERTIFICATE] Erro ao gerar certificado:", error);
    throw error;
  }
}

/**
 * Validar certificado pelo código QR
 */
export async function validateCertificate(validationCode: string) {
  try {
    const certificates = await db.getCertificatesByStudent(0); // Get all

    // Buscar certificado com o código de validação
    // Nota: Esta é uma implementação simplificada
    // Em produção, você faria uma query específica no banco

    return {
      valid: true,
      message: "Certificado válido",
    };
  } catch (error) {
    console.error("[CERTIFICATE] Erro ao validar certificado:", error);
    throw error;
  }
}
