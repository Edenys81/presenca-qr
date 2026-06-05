import { useState } from "react";
import { Download, Copy, Printer, Share2, RotateCw, X } from "lucide-react";
import { toast } from "sonner";

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrCodeUrl: string | null;
  eventName: string;
  eventId: number;
  isLoading?: boolean;
  onRegenerate?: () => void;
}

export function QRCodeModal({
  isOpen,
  onClose,
  qrCodeUrl,
  eventName,
  eventId,
  isLoading = false,
  onRegenerate,
}: QRCodeModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Baixar QR Code como imagem
  const handleDownload = () => {
    if (!qrCodeUrl) return;

    const link = document.createElement("a");
    link.href = qrCodeUrl;
    link.download = `qrcode-evento-${eventId}-${eventName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("QR Code baixado com sucesso!");
  };

  // Copiar QR Code para clipboard
  const handleCopy = async () => {
    if (!qrCodeUrl) return;

    try {
      const blob = await fetch(qrCodeUrl).then((res) => res.blob());
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setCopied(true);
      toast.success("QR Code copiado para clipboard!");

      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Erro ao copiar QR Code");
      console.error(error);
    }
  };

  // Imprimir QR Code
  const handlePrint = () => {
    if (!qrCodeUrl) return;

    const printWindow = window.open("", "", "height=400,width=600");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Code - ${eventName}</title>
            <style>
              body {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
              }
              h1 {
                margin-bottom: 20px;
                color: #333;
              }
              img {
                max-width: 400px;
                height: auto;
                border: 2px solid #ccc;
                padding: 10px;
              }
              p {
                margin-top: 20px;
                color: #666;
                font-size: 14px;
              }
              @media print {
                body {
                  padding: 0;
                }
              }
            </style>
          </head>
          <body>
            <h1>QR Code - ${eventName}</h1>
            <img src="${qrCodeUrl}" alt="QR Code" />
            <p>Evento ID: ${eventId}</p>
            <p>Data: ${new Date().toLocaleDateString("pt-BR")}</p>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Compartilhar QR Code
  const handleShare = async () => {
    if (!qrCodeUrl) return;

    try {
      const blob = await fetch(qrCodeUrl).then((res) => res.blob());
      const file = new File(
        [blob],
        `qrcode-evento-${eventId}.png`,
        { type: "image/png" }
      );

      if (navigator.share) {
        await navigator.share({
          title: `QR Code - ${eventName}`,
          text: `Escaneie este QR Code para registrar presença no evento: ${eventName}`,
          files: [file],
        });
        toast.success("QR Code compartilhado!");
      } else {
        toast.info("Compartilhamento não suportado neste navegador");
      }
    } catch (error) {
      console.error("Erro ao compartilhar:", error);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="qrcode-modal-overlay"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="qrcode-modal-container">
        <div className="qrcode-modal">
          {/* Header */}
          <div className="qrcode-modal-header">
            <div>
              <h2 className="qrcode-modal-title">
                QR Code - {eventName}
              </h2>
              <p className="qrcode-modal-subtitle">
                Compartilhe este QR Code com os alunos para registrar presença
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="qrcode-modal-close-btn"
              title="Fechar"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="qrcode-modal-content">
            {/* Imagem do QR Code */}
            <div className="qrcode-modal-image-container">
              {isLoading ? (
                <div className="qrcode-modal-loading">
                  <div className="qrcode-spinner"></div>
                </div>
              ) : qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt={`QR Code - ${eventName}`}
                  className="qrcode-modal-image"
                />
              ) : (
                <div className="qrcode-modal-empty">
                  <p>QR Code não disponível</p>
                </div>
              )}
            </div>

            {/* Informações do evento */}
            <div className="qrcode-modal-info">
              <p>
                <strong>Evento:</strong> {eventName}
              </p>
              <p>
                <strong>ID:</strong> {eventId}
              </p>
              <p>
                <strong>Gerado em:</strong>{" "}
                {new Date().toLocaleString("pt-BR")}
              </p>
            </div>

            {/* Botões de ação */}
            <div className="qrcode-modal-buttons-grid">
              <button
                onClick={handleDownload}
                disabled={!qrCodeUrl || isLoading}
                className="qrcode-modal-btn qrcode-modal-btn-outline"
                title="Baixar QR Code"
              >
                <Download size={16} />
                <span>Baixar</span>
              </button>

              <button
                onClick={handleCopy}
                disabled={!qrCodeUrl || isLoading}
                className="qrcode-modal-btn qrcode-modal-btn-outline"
                title="Copiar para clipboard"
              >
                <Copy size={16} />
                <span>{copied ? "Copiado!" : "Copiar"}</span>
              </button>

              <button
                onClick={handlePrint}
                disabled={!qrCodeUrl || isLoading}
                className="qrcode-modal-btn qrcode-modal-btn-outline"
                title="Imprimir"
              >
                <Printer size={16} />
                <span>Imprimir</span>
              </button>

              <button
                onClick={handleShare}
                disabled={!qrCodeUrl || isLoading}
                className="qrcode-modal-btn qrcode-modal-btn-outline"
                title="Compartilhar"
              >
                <Share2 size={16} />
                <span>Compartilhar</span>
              </button>
            </div>

            {/* Botão para regenerar */}
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                disabled={isLoading}
                className="qrcode-modal-btn qrcode-modal-btn-secondary"
                style={{ width: "100%" }}
              >
                <RotateCw size={16} />
                <span>Regenerar QR Code</span>
              </button>
            )}

            {/* Botão fechar */}
            <button
              onClick={onClose}
              disabled={isLoading}
              className="qrcode-modal-btn qrcode-modal-btn-primary"
              style={{ width: "100%" }}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
