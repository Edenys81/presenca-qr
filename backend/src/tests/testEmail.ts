import { describe, it, expect } from "vitest";
import * as emailService from "../services/emailService.js";

describe("Email Service", ( ) => {
  it("should send email successfully", async () => {
    const result = await emailService.sendEmail(
      "seu-email@gmail.com",
      "Teste de Email",
      "<p>Este é um email de teste</p>"
    );

    expect(result).toBe(true);
  });

  it("should test email connection", async () => {
    const result = await emailService.testEmailConnection();
    expect(result).toBe(true);
  });
});