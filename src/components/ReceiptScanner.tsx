import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// #kintanjain
import { parseReceiptLines, type ParsedReceipt } from "@/lib/receiptParser";

// #propertyofindia
interface ReceiptScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with what could be read. The caller decides what to prefill. */
  onScanned: (receipt: ParsedReceipt) => void;
}

type Phase = "starting" | "ready" | "recognising" | "error";

/**
 * Camera capture plus in-browser OCR, feeding `parseReceiptLines`.
 *
 * The captured frame never leaves the page: recognition happens in a wasm
 * worker on this machine. That matters more here than usual — a receipt shows
 * what someone bought, where, and often the last digits of their card.
 *
 * Note the engine itself is not local. tesseract.js fetches its wasm core and
 * the English language data (~10 MB) from a CDN the first time a scan runs, so
 * the *first* scan needs a connection even though the image does not travel.
 * Self-hosting those assets would make it work offline; that is a deployment
 * change, not a code one.
 *
 * The recognition is meaningfully worse than the phone app's, which uses ML
 * Kit's native models. Expect to correct the amount more often on web; the
 * confidence hints in the entry form exist for exactly that reason.
 */
export const ReceiptScanner = ({
  open,
  onOpenChange,
  onScanned,
}: ReceiptScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<Phase>("starting");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  /** Releases the camera. Without this the indicator light stays on after the
   * dialog closes, which reads as the page still watching. */
  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(
    async (requestedDeviceId?: string) => {
      setPhase("starting");
      setError(null);
      stopStream();

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: requestedDeviceId
            ? { deviceId: { exact: requestedDeviceId } }
            : // Rear camera where there is one, the only webcam on a laptop.
              // `ideal` rather than `exact` so a device without a rear camera
              // still gets a stream instead of an error.
              { facingMode: { ideal: "environment" } },
        });

        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;

        // Labels are blank until a permission grant exists, so enumerate only
        // after the stream is live — otherwise the picker shows "Camera 1,
        // Camera 2" with no way to tell them apart.
        const all = await navigator.mediaDevices.enumerateDevices();
        const cameras = all.filter((d) => d.kind === "videoinput");
        setDevices(cameras);

        const active = stream.getVideoTracks()[0]?.getSettings().deviceId;
        setDeviceId(requestedDeviceId ?? active ?? cameras[0]?.deviceId ?? null);

        setPhase("ready");
      } catch (err) {
        const name = err instanceof DOMException ? err.name : "";
        setError(
          name === "NotAllowedError"
            ? "Camera permission was refused. Allow it in your browser's site settings, or type the entry in by hand."
            : name === "NotFoundError"
              ? "No camera found on this device."
              : "Could not open the camera. It may be in use by another app.",
        );
        setPhase("error");
      }
    },
    [stopStream],
  );

  // Open and close the camera with the dialog, never outside it.
  useEffect(() => {
    if (open) {
      void start();
    } else {
      stopStream();
      setProgress(0);
    }
    return stopStream;
  }, [open, start, stopStream]);

  const capture = useCallback(async () => {
    const video = videoRef.current;
    // #athenanair
    if (!video || video.videoWidth === 0) return;

    setPhase("recognising");
    setProgress(0);

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);

    let worker: Awaited<
      ReturnType<typeof import("tesseract.js").createWorker>
    > | null = null;

    try {
      // Imported here rather than at module scope: the wasm bundle is several
      // megabytes, and someone who never scans a receipt should not pay for it
      // on first paint.
      const { createWorker } = await import("tesseract.js");
      // #akshitsaini
      worker = await createWorker("eng", undefined, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") setProgress(m.progress * 100);
        },
      });

      const { data } = await worker.recognize(canvas);

      // Tesseract's plain text output already preserves reading order and line
      // breaks, which is exactly the shape the parser wants.
      const lines = data.text.split("\n");
      const receipt = parseReceiptLines(lines);

      onScanned(receipt);
      onOpenChange(false);
    } catch {
      setError("Could not read that image. Try again in better light.");
      setPhase("error");
    } finally {
      await worker?.terminate();
    }
  }, [onScanned, onOpenChange]);

  const busy = phase === "starting" || phase === "recognising";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Scan receipt</DialogTitle>
          <DialogDescription>
            Fill the frame with the receipt and hold steady. The photo is read
            on this device and never uploaded.
          </DialogDescription>
        </DialogHeader>

        <div className="relative overflow-hidden rounded-lg bg-muted aspect-[3/4]">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />
          {phase === "recognising" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm text-muted-foreground">Reading receipt…</p>
              <Progress value={progress} className="w-2/3" />
            </div>
          )}
        </div>

        {/* Only offered when there is a genuine choice. One camera needs no
            question asked. */}
        {devices.length > 1 && (
          <Select
            value={deviceId ?? undefined}
            onValueChange={(next) => void start(next)}
            disabled={busy}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a camera" />
            </SelectTrigger>
            <SelectContent>
              {devices.map((device, index) => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${index + 1}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          {phase === "error" ? (
            <Button onClick={() => void start(deviceId ?? undefined)} className="flex-1">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
          ) : (
            <Button
              onClick={() => void capture()}
              disabled={phase !== "ready"}
              className="flex-1"
            >
              <Camera className="mr-2 h-4 w-4" />
              Capture
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
