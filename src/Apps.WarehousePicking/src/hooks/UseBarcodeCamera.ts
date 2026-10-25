import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { eanError } from "@/utils/Barcode";

export type CameraStatus = "starting" | "scanning" | "unavailable";

export function useBarcodeCamera(
  videoEl: HTMLVideoElement | null,
  active: boolean,
  onDetected: (barcode: string) => void
): CameraStatus {
  const [status, setStatus] = useState<CameraStatus>("starting");
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;

  useEffect(() => {
    if (!active || !videoEl) return;
    setStatus("starting");
    videoEl.muted = true;

    let cancelled = false;
    let controls: IScannerControls | null = null;
    new BrowserMultiFormatReader()
      .decodeFromConstraints({ video: { facingMode: { ideal: "environment" } } }, videoEl, (result, _error, scanner) => {
        controls = scanner;
        if (cancelled || !result) return;
        const barcode = result.getText();
        if (eanError(barcode)) return;
        scanner.stop();
        onDetectedRef.current(barcode);
      })
      .then((scanner) => {
        controls = scanner;
        if (cancelled) scanner.stop();
        else setStatus("scanning");
      })
      .catch(() => {
        if (!cancelled) setStatus("unavailable");
      });

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [active, videoEl]);

  return status;
}
