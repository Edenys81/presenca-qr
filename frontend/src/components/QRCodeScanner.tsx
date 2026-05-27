import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2, QrCode, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface QRCodeScannerProps {
  onScan: (qrCodeId: string) => void;
  isLoading?: boolean;
}

export function QRCodeScanner({ onScan, isLoading }: QRCodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<"granted" | "denied" | "pending">("pending");
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState(false);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsScanning(true);
          setCameraPermission("granted");
          setError(null);
        }
      } catch (err) {
        setError("Não foi possível acessar a câmera. Verifique as permissões.");
        setCameraPermission("denied");
      }
    };

    if (cameraPermission === "pending") {
      startCamera();
    }

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, [cameraPermission]);

  useEffect(() => {
    if (!isScanning || cameraPermission !== "granted") return;

    const detectQRCode = () => {
      if (!videoRef.current || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;

      ctx.drawImage(videoRef.current, 0, 0);

      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, canvas.width, canvas.height);

        if (code) {
          const qrData = code.data;
          
          // Evitar múltiplas leituras do mesmo código
          if (qrData !== lastScannedCode) {
            setLastScannedCode(qrData);
            setScanSuccess(true);
            setIsScanning(false);
            
            // Chamar callback
            onScan(qrData);

            // Resetar estado de sucesso após 2 segundos
            scanTimeoutRef.current = setTimeout(() => {
              setScanSuccess(false);
              setLastScannedCode(null);
              setIsScanning(true);
            }, 2000);
          }
        }
      } catch (err) {
        console.error("QR Code detection error:", err);
      }

      if (isScanning) {
        requestAnimationFrame(detectQRCode);
      }
    };

    const animationId = requestAnimationFrame(detectQRCode);
    return () => cancelAnimationFrame(animationId);
  }, [isScanning, cameraPermission, lastScannedCode, onScan]);

  const handleManualInput = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const qrCodeId = formData.get("qrCodeId") as string;
    if (qrCodeId) {
      onScan(qrCodeId);
      (e.currentTarget as HTMLFormElement).reset();
    }
  };

  const handleRetry = () => {
    setScanSuccess(false);
    setLastScannedCode(null);
    setIsScanning(true);
    setError(null);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Leitor de QR Code
        </CardTitle>
        <CardDescription>
          Aponte a câmera para o QR Code do evento para registrar sua presença
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {scanSuccess && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              QR Code detectado com sucesso! Processando...
            </AlertDescription>
          </Alert>
        )}

        {cameraPermission === "granted" && (
          <div className="relative w-full bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full aspect-square object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Guia visual para o usuário */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Borda externa com cantos */}
              <div className="absolute inset-0 border-2 border-yellow-400 rounded-lg" />
              
              {/* Cantos destacados */}
              <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-yellow-400" />
              <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-yellow-400" />
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-yellow-400" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-yellow-400" />
              
              {/* Indicador de scanning */}
              {isScanning && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-24 h-24 border-2 border-yellow-400 rounded-lg animate-pulse" />
                </div>
              )}
            </div>

            {/* Status de scanning */}
            {isScanning && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                Escaneando...
              </div>
            )}
          </div>
        )}

        {cameraPermission === "denied" && (
          <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Câmera não disponível</p>
              <p className="text-xs text-gray-500 mt-1">Verifique as permissões do navegador</p>
            </div>
          </div>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Ou insira manualmente</span>
          </div>
        </div>

        <form onSubmit={handleManualInput} className="space-y-2">
          <input
            type="text"
            name="qrCodeId"
            placeholder="Cole o código QR aqui"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            disabled={isLoading || scanSuccess}
          />
          <Button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700"
            disabled={isLoading || cameraPermission === "denied" || scanSuccess}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Registrando...
              </>
            ) : scanSuccess ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Processando...
              </>
            ) : (
              "Registrar Presença"
            )}
          </Button>
        </form>

        {scanSuccess && (
          <Button
            variant="outline"
            className="w-full"
            onClick={handleRetry}
            disabled={isLoading}
          >
            Escanear Outro QR Code
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
