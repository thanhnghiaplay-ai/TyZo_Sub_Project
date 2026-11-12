import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { pushToast } from "@/components/toast";
import { getAlibabaDesk, saveAlibabaDesk, saveAlibabaKey, saveServicePacks } from "@/lib/pack-room";
import { ALIBABA_ROWS } from "@/lib/sub/alibaba-catalog";
import { loadGroqBoard } from "@/lib/sub/groq-board-load";
import type { GroqBoard } from "@/lib/sub/groq-board";
import { emptyOverride, type PriceOverride, type RunDesk } from "@/lib/run-desk";
import { PACK_ROLE_LABEL, PACK_ROLES, quotePack, type PackRole, type ServicePack } from "@/lib/service-pack";
import { PROVIDER_LABEL, type ProviderId } from "@/lib/sub/provider";
import type { PriceBook } from "@/lib/run-bill";

function dong(n: number | null) {
  if (n == null) return "Chưa có giá gốc";
  return new Intl.NumberFormat("vi-VN").format(n) + " đ";
}

function freshPack(groqModels: string[] | null): ServicePack {
  const chat = groqModels?.find((id) => !/whisper|orpheus/i.test(id)) || "qwen-plus";
  const asr = groqModels?.find((id) => /whisper/i.test(id)) || "whisper-large-v3-turbo";
  const id = `pack_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  return {
    id,
    name: "Gói mới",
    note: "",
    enabled: false,
    doors: ["turn", "rent"],
    roles: {
      asr: { provider: "groq", model: asr },
      translate: { provider: "groq", model: chat },
    },
  };
}

export function ServicePackBoard({ packsOnly = false }: { packsOnly?: boolean }) {
  const [desk, setDesk] = useState<RunDesk | null>(null);
  const [models, setModels] = useState<string[] | null>(null);
  const [groqModels, setGroqModels] = useState<string[] | null>(null);
  const [packs, setPacks] = useState<ServicePack[]>([]);
  const [keyTail, setKeyTail] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [board, setBoard] = useState<GroqBoard | null>(null);

  useEffect(() => {
    void getAlibabaDesk()
      .then((next) => {
        setDesk(next.desk);
        setModels(next.models);
        setGroqModels(next.groqModels);
        setPacks(next.packs);
        setKeyTail(next.keyTail);
      })
      .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa đọc được bàn Alibaba.", "bad"));
    void loadGroqBoard().then(setBoard).catch(() => undefined);
  }, []);

  const choices = useMemo(() => {
    const groq = [...new Set([...(groqModels ?? []), "whisper-large-v3-turbo", "whisper-large-v3"])];
    const alibaba = [...new Set([...(models ?? []), ...ALIBABA_ROWS.map((row) => row.id)])];
    return { groq, alibaba };
  }, [groqModels, models]);

  function saveDesk(next: RunDesk) {
    setBusy(true);
    void saveAlibabaDesk({ data: { ...next, maintenance: false } })
      .then((saved) => {
        setDesk(saved);
        pushToast("Đã lưu giá Alibaba.");
      })
      .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa lưu được giá Alibaba.", "bad"))
      .finally(() => setBusy(false));
  }

  function syncKey() {
    const token = adminKey.trim();
    if (!token) return pushToast("Hãy nhập key Alibaba.", "bad");
    setBusy(true);
    void saveAlibabaKey({ data: token })
      .then((ids) => {
        setModels(ids);
        setKeyTail(token.slice(-4));
        setAdminKey("");
        setShowKey(false);
        pushToast(`Đã lưu key Alibaba. Key gọi được ${ids.length} model.`);
      })
      .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa đồng bộ được key Alibaba.", "bad"))
      .finally(() => setBusy(false));
  }

  function savePacks(next: ServicePack[]) {
    setBusy(true);
    void saveServicePacks({ data: next })
      .then((saved) => {
        setPacks(saved);
        pushToast("Đã lưu các gói dịch.");
      })
      .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa lưu được gói.", "bad"))
      .finally(() => setBusy(false));
  }

  function patchPack(id: string, patch: Partial<ServicePack>) {
    setPacks((current) => current.map((pack) => (pack.id === id ? { ...pack, ...patch } : pack)));
  }

  function setRole(id: string, role: PackRole, provider: ProviderId | "", model: string) {
    setPacks((current) =>
      current.map((pack) => {
        if (pack.id !== id) return pack;
        const roles = { ...pack.roles };
        if (!provider || !model) delete roles[role];
        else roles[role] = { provider, model };
        return { ...pack, roles };
      }),
    );
  }

  const sampleBook = (rows: PriceBook["rows"], markup: number, custom: RunDesk["custom"]): PriceBook | null => {
    if (!board) return null;
    return { rate: board.rate, rows, desk: { markup, custom } };
  };

  return (
    <section className="admin-wide space-y-4 rounded-2xl border border-line bg-card p-4">
      <div>
        <h3 className="text-sm font-semibold">{packsOnly ? "Gói dịch" : "Nhà cung cấp và gói dịch"}</h3>
        <p className="text-sm text-muted">
          {packsOnly
            ? "Mỗi việc chọn một nhà và một model. Khách ở cửa trả theo lượt chọn gói đã bật. Khách chỉ thấy giá đã cộng phần trăm."
            : "Groq giữ bàn giá phía trên. Alibaba có key, phần trăm chênh và giá riêng. Mỗi gói giao việc cho một hoặc nhiều model. Khách chỉ chọn gói."}
        </p>
      </div>

      {!packsOnly && (
      <div className="grid gap-2">
        <p className="text-sm font-medium">Key Alibaba Model Studio {keyTail ? `· đuôi ${keyTail}` : "· chưa lưu"}</p>
        <div className="flex gap-2">
          <input
            className="min-tap min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 text-sm"
            type={showKey ? "text" : "password"}
            value={adminKey}
            autoComplete="off"
            placeholder="sk-… key quốc tế"
            onChange={(event) => setAdminKey(event.target.value)}
          />
          <button type="button" className="min-tap rounded-xl border border-line px-3" onClick={() => setShowKey((value) => !value)} aria-label={showKey ? "Ẩn key" : "Hiện key"}>
            {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
          <button type="button" className="min-tap rounded-xl bg-accent px-3 text-sm font-semibold text-ink disabled:opacity-50" disabled={busy} onClick={syncKey}>
            Đồng bộ
          </button>
        </div>
        <p className="text-xs text-muted">{models ? `${models.length} model trên key.` : "Chưa đồng bộ."} Giá gốc lấy từ bảng niêm yết trong app. Model nhận dạng Alibaba chưa có giờ công bố thì nhập giá riêng theo giờ.</p>
      </div>
      )}

      {desk && (
        <label className="grid max-w-xs gap-1 text-sm">
          Phần trăm chênh Alibaba
          <input
            className="min-tap rounded-xl border border-line bg-bg px-3"
            inputMode="numeric"
            value={desk.markup}
            onChange={(event) => setDesk({ ...desk, markup: Number(event.target.value.replace(/\D/g, "") || 0) })}
          />
        </label>
      )}

      {desk && (
        <div className="grid gap-2">
          {[...new Set([...ALIBABA_ROWS.map((row) => row.id), ...(models ?? [])])].map((id) => {
            const custom = desk.custom[id] ?? emptyOverride();
            const setCustom = (patch: Partial<PriceOverride>) => setDesk({ ...desk, custom: { ...desk.custom, [id]: { ...custom, ...patch } } });
            return (
              <div key={id} className="grid gap-2 rounded-xl border border-line px-3 py-2 sm:grid-cols-[1fr_repeat(3,7rem)] sm:items-center">
                <p className="text-sm">{id}</p>
                <input className="min-tap rounded-lg border border-line bg-bg px-2 text-sm" inputMode="numeric" aria-label={`${id} giá giờ`} placeholder="đ/giờ" value={custom.hour || ""} onChange={(event) => setCustom({ hour: Number(event.target.value.replace(/\D/g, "") || 0) })} />
                <input className="min-tap rounded-lg border border-line bg-bg px-2 text-sm" inputMode="numeric" aria-label={`${id} giá vào`} placeholder="đ vào" value={custom.inn || ""} onChange={(event) => setCustom({ inn: Number(event.target.value.replace(/\D/g, "") || 0) })} />
                <input className="min-tap rounded-lg border border-line bg-bg px-2 text-sm" inputMode="numeric" aria-label={`${id} giá ra`} placeholder="đ ra" value={custom.out || ""} onChange={(event) => setCustom({ out: Number(event.target.value.replace(/\D/g, "") || 0) })} />
              </div>
            );
          })}
          <p className="text-xs text-muted">Khách chỉ thấy giá đã cộng phần trăm. Phần trăm Groq ở bàn phía trên. Giá riêng để trống thì dùng phần trăm.</p>
          <button type="button" className="min-tap justify-self-start rounded-xl bg-accent px-3 text-sm font-semibold text-ink disabled:opacity-50" disabled={busy} onClick={() => saveDesk(desk)}>
            Lưu giá Alibaba
          </button>
        </div>
      )}

      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold">Gói dịch</h4>
          <button type="button" className="min-tap rounded-xl border border-line px-3 text-sm" onClick={() => setPacks((current) => [...current, freshPack(groqModels)])}>
            Thêm gói
          </button>
        </div>
        {packs.map((pack) => {
          const groqBook = sampleBook(board?.rows ?? [], board ? 0 : 0, {});
          const aliBook = desk && board ? sampleBook(ALIBABA_ROWS, desk.markup, desk.custom) : null;
          const quote = board && groqBook
            ? quotePack({
                pack,
                seconds: 600,
                door: "turn",
                narration: Boolean(pack.roles.narration),
                books: { groq: { ...groqBook, desk: { markup: 0, custom: {} } }, ...(aliBook ? { alibaba: aliBook } : {}) },
              })
            : null;
          return (
            <article key={pack.id} className="grid gap-2 rounded-xl border border-line p-3">
              <div className="flex flex-wrap items-center gap-2">
                <input className="min-tap min-w-40 flex-1 rounded-xl border border-line bg-bg px-3 text-sm" value={pack.name} onChange={(event) => patchPack(pack.id, { name: event.target.value })} />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={pack.enabled} onChange={(event) => patchPack(pack.id, { enabled: event.target.checked })} />
                  Mở
                </label>
                <button type="button" className="text-sm text-muted" onClick={() => setPacks((current) => current.filter((item) => item.id !== pack.id))}>
                  Xóa
                </button>
              </div>
              <input className="min-tap rounded-xl border border-line bg-bg px-3 text-sm" placeholder="Gói này hợp việc gì" value={pack.note} onChange={(event) => patchPack(pack.id, { note: event.target.value })} />
              <div className="flex gap-3 text-sm">
                {(["turn", "rent"] as const).map((door) => (
                  <label key={door} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={pack.doors.includes(door)}
                      onChange={(event) => {
                        const doors = event.target.checked ? [...pack.doors, door] : pack.doors.filter((item) => item !== door);
                        patchPack(pack.id, { doors: doors.length ? doors : pack.doors });
                      }}
                    />
                    {door === "turn" ? "Trả theo lượt" : "Thuê phòng"}
                  </label>
                ))}
              </div>
              {PACK_ROLES.map((role) => {
                const assign = pack.roles[role];
                const provider = assign?.provider ?? "";
                const list = provider === "alibaba" ? choices.alibaba : provider === "groq" ? choices.groq : [];
                return (
                  <div key={role} className="grid gap-2 sm:grid-cols-[7rem_8rem_1fr] sm:items-center">
                    <span className="text-sm">{PACK_ROLE_LABEL[role]}</span>
                    <select
                      className="min-tap rounded-xl border border-line bg-bg px-2 text-sm"
                      value={provider}
                      onChange={(event) => {
                        const next = event.target.value as ProviderId | "";
                        const model = next === "alibaba" ? choices.alibaba[0] || "" : next === "groq" ? choices.groq[0] || "" : "";
                        setRole(pack.id, role, next, model);
                      }}
                    >
                      {role !== "asr" && role !== "translate" && <option value="">Không tách</option>}
                      <option value="groq">{PROVIDER_LABEL.groq}</option>
                      <option value="alibaba">{PROVIDER_LABEL.alibaba}</option>
                    </select>
                    <select
                      className="min-tap rounded-xl border border-line bg-bg px-2 text-sm"
                      value={assign?.model ?? ""}
                      disabled={!provider}
                      onChange={(event) => setRole(pack.id, role, provider as ProviderId, event.target.value)}
                    >
                      {list.map((id) => (
                        <option key={id} value={id}>{id}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
              {quote && (
                <p className="text-xs text-muted">
                  Ước tính 10 phút. Phần chênh Alibaba đã tính. Phần chênh Groq nằm ở bàn phía trên, mẫu này chưa cộng: gốc {dong(quote.base)} · giữ {dong(quote.hold)}
                  {quote.ready ? "" : " · chưa đủ giá"}
                </p>
              )}
            </article>
          );
        })}
        <button type="button" className="min-tap justify-self-start rounded-xl bg-accent px-3 text-sm font-semibold text-ink disabled:opacity-50" disabled={busy} onClick={() => savePacks(packs)}>
          Lưu gói
        </button>
      </div>
    </section>
  );
}
