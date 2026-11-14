import { useCallback, useEffect, useRef, useState } from "react";
import { openLiveTicket } from "@/lib/live/live-open";
import { getRoomAccount } from "@/lib/room-account";
import { LiveSession, type SocketLike } from "@/lib/live/live-session";
import { LiveTranscript, type LiveLine } from "@/lib/live/live-transcript";
import { createBrowserPlayer } from "@/lib/live/live-player-browser";
import { micEnv, openBrowserGraph } from "@/lib/live/live-mic-browser";
import { CaptureError, startCapture, type CaptureEnv, type StreamLike } from "@/lib/live/live-mic";
import { micErrorMessage } from "@/lib/live/live-mic-errors";
import { tabEnv, tabErrorMessage } from "@/lib/live/live-tab";
import { liveMinutes, liveMoneyLeft, liveWarn, type LiveUiState, type LiveWarn } from "@/lib/live/live-view";

export type LiveInput = "mic" | "tab";
export type LiveSettings = { model: string; target: string; source: string; audio: boolean; input: LiveInput };

export type LiveApi = {
  state: LiveUiState;
  lines: LiveLine[];
  cues: ReturnType<LiveTranscript["cues"]>;
  level: number;
  error: string | null;
  /** Số dư tự do trong ví (đã trừ tiền đang giữ), null khi chưa biết. */
  free: number | null;
  perMinute: number | null;
  /** Tổng còn dùng được: số dư tự do + tiền đang giữ cho phiên. */
  money: number | null;
  minutes: number | null;
  warn: LiveWarn;
  elapsedMs: number;
  reconnecting: number;
  start(settings: LiveSettings): void;
  stop(): void;
  /** Xóa chữ đã hiện (chỉ khi không đang chạy). */
  clear(): void;
  refreshBalance(): void;
};

const BALANCE_EVERY_MS = 15_000;

/**
 * Nối LiveSession với đồ thật của trình duyệt. Hàm `start` phải được gọi thẳng từ cú bấm của khách:
 * loa (Safari) và chia sẻ tab (Chrome) chỉ chịu mở trong lúc cú bấm còn hiệu lực, nên cả hai được
 * tạo trước mọi bước chờ mạng (xin vé, nối cầu nối).
 */
export function useLive(): LiveApi {
  const [state, setState] = useState<LiveUiState>("idle");
  const [, setTick] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [free, setFree] = useState<number | null>(null);
  const [perMinute, setPerMinute] = useState<number | null>(null);
  const [heldLeft, setHeldLeft] = useState(0);
  const [denied, setDenied] = useState(false);
  const [bridgeLow, setBridgeLow] = useState(false);
  const [reconnecting, setReconnecting] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);

  const sessionRef = useRef<LiveSession | null>(null);
  const transcriptRef = useRef(new LiveTranscript());
  const startedAtRef = useRef(0);
  const busyRef = useRef(false);
  const streamRef = useRef<StreamLike | null>(null);
  const lastBalanceRef = useRef(0);
  const aliveRef = useRef(true);

  const bump = useCallback(() => setTick((value) => value + 1), []);

  const refreshBalance = useCallback(() => {
    lastBalanceRef.current = Date.now();
    void getRoomAccount()
      .then((account) => {
        if (aliveRef.current) setFree(account.balance);
      })
      .catch(() => undefined);
  }, []);

  const releaseStream = useCallback(() => {
    const stream = streamRef.current;
    streamRef.current = null;
    stream?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    refreshBalance();
    const refresh = () => refreshBalance();
    window.addEventListener("tyzo-room-refresh", refresh);
    return () => {
      aliveRef.current = false;
      window.removeEventListener("tyzo-room-refresh", refresh);
      sessionRef.current?.stop();
      releaseStream();
    };
  }, [refreshBalance, releaseStream]);

  // Đồng hồ chạy khi đang dịch.
  useEffect(() => {
    if (state !== "live" && state !== "connecting" && state !== "closing") return;
    const id = window.setInterval(() => setElapsedMs(Date.now() - startedAtRef.current), 1000);
    return () => window.clearInterval(id);
  }, [state]);

  const start = useCallback(
    (settings: LiveSettings) => {
      if (busyRef.current || sessionRef.current) return;
      busyRef.current = true;
      setError(null);
      setBridgeLow(false);
      setDenied(false);
      setHeldLeft(0);
      setReconnecting(0);
      setElapsedMs(0);
      setLevel(0);
      transcriptRef.current = new LiveTranscript();
      setState("opening");

      // Đồng bộ trong cú bấm: loa và (nếu là tab) hộp chọn tab.
      const player = createBrowserPlayer();
      const env: CaptureEnv = settings.input === "tab" ? tabEnv() : micEnv();
      const describe = settings.input === "tab" ? tabErrorMessage : micErrorMessage;
      // Gọi đồng bộ để còn trong cú bấm; thiếu mediaDevices thì ném lỗi ngay, đổi thành lời từ chối để đi chung đường báo lỗi.
      let gotStream: Promise<StreamLike>;
      try {
        gotStream = env.getStream();
      } catch (cause) {
        gotStream = Promise.reject(cause);
      }

      void (async () => {
        const giveUp = (message: string) => {
          player.stop();
          releaseStream();
          busyRef.current = false;
          if (!aliveRef.current) return;
          setError(message);
          setState("idle");
        };
        try {
          try {
            streamRef.current = await gotStream;
          } catch (cause) {
            return giveUp(describe(cause));
          }
          let ticket: Awaited<ReturnType<typeof openLiveTicket>>;
          try {
            ticket = await openLiveTicket({ data: { model: settings.model, target: settings.target, source: settings.source, audio: settings.audio } });
          } catch (cause) {
            return giveUp(cause instanceof Error && cause.message ? cause.message : "Chưa mở được phiên dịch trực tiếp. Hãy thử lại.");
          }
          if (!aliveRef.current) return giveUp("");
          setPerMinute(ticket.perMinute);
          setFree(ticket.balance);
          const prebuilt: CaptureEnv = { getStream: async () => streamRef.current ?? env.getStream(), openGraph: openBrowserGraph };
          startedAtRef.current = Date.now();
          const session = new LiveSession(
            {
              createSocket: (url) => new WebSocket(url) as unknown as SocketLike,
              startCapture: (handlers) => startCapture(prebuilt, handlers, describe),
              player,
            },
            {
              onState: (next) => {
                if (!aliveRef.current) return;
                if (next === "idle") setState("idle");
                else setState(next);
              },
              onEvent: (event) => {
                transcriptRef.current.apply(event, Date.now() - startedAtRef.current);
                setReconnecting(0);
                bump();
              },
              onBalance: ({ heldLeft: left, denied: no }) => {
                setHeldLeft(left);
                setDenied(no);
                setReconnecting(0);
                if (Date.now() - lastBalanceRef.current > BALANCE_EVERY_MS) refreshBalance();
              },
              onLow: () => {
                setBridgeLow(true);
                refreshBalance();
              },
              onLevel: (value) => setLevel(value),
              onReconnecting: (attempt) => setReconnecting(attempt),
              onError: (message) => setError(message),
              onClosed: () => {
                sessionRef.current = null;
                busyRef.current = false;
                releaseStream();
                if (!aliveRef.current) return;
                setLevel(0);
                setHeldLeft(0);
                setDenied(false);
                setReconnecting(0);
                setElapsedMs(Date.now() - startedAtRef.current);
                bump();
                // Phiếu đã đóng, tiền thừa đã nhả: lấy số dư thật rồi báo các khung khác trên trang.
                refreshBalance();
                window.dispatchEvent(new Event("tyzo-room-refresh"));
              },
            },
          );
          sessionRef.current = session;
          session.start(ticket.url);
        } catch (cause) {
          giveUp(cause instanceof CaptureError || cause instanceof Error ? cause.message : "Chưa bắt đầu được. Hãy thử lại.");
        }
      })();
    },
    [bump, refreshBalance, releaseStream],
  );

  const stop = useCallback(() => {
    sessionRef.current?.stop();
  }, []);

  const clear = useCallback(() => {
    if (sessionRef.current || busyRef.current) return;
    transcriptRef.current = new LiveTranscript();
    setElapsedMs(0);
    setError(null);
    setState("idle");
    bump();
  }, [bump]);

  const running = state === "live" || state === "connecting" || state === "closing";
  const money = free == null ? null : liveMoneyLeft({ free, heldLeft: running ? heldLeft : 0 });
  const minutes = money == null ? null : liveMinutes(money, perMinute);
  const warn = liveWarn({ minutes, bridgeLow: running && bridgeLow, denied, running });

  return {
    state,
    lines: transcriptRef.current.list(),
    cues: transcriptRef.current.cues(),
    level,
    error,
    free,
    perMinute,
    money,
    minutes,
    warn,
    elapsedMs,
    reconnecting,
    start,
    stop,
    clear,
    refreshBalance,
  };
}
