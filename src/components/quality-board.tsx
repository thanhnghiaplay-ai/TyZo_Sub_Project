import { useEffect, useMemo, useState } from "react";
import { getQualityBoard } from "@/lib/quality-room";
import { compareVersionDesc, groupRollup, hintsFor, langCheckVerdict, rollup, type BoardRow, type Rollup } from "@/lib/quality-board";
import { BAND_COLOR, BandBar, HealthPill, HEALTH_COLOR, pct } from "@/components/quality-view";

const LANG_NAME: Record<string, string> = { zh: "Tiếng Trung", ko: "Tiếng Hàn", ja: "Tiếng Nhật", en: "Tiếng Anh" };

function hours(seconds: number) {
  const h = seconds / 3600;
  return h >= 10 ? `${Math.round(h)} giờ` : `${h.toFixed(1)} giờ`;
}

function share(n: number, total: number) {
  return total > 0 ? pct(n / total, 1) : "—";
}

function SummaryCard({ title, data }: { title: string; data: Rollup }) {
  return (
    <article className="grid content-start gap-2 rounded-2xl border border-line bg-bg p-3">
      <h3 className="font-semibold">{title}</h3>
      {data.runs === 0 ? (
        <p className="text-sm text-muted">Chưa có lần chạy nào.</p>
      ) : (
        <>
          <HealthPill health={data.health} reason={data.healthReason} />
          <p className="text-sm">
            Độ tin trung bình <span className="font-semibold">{pct(data.meanConfidence)}</span>
            <span className="text-muted"> · {data.runs} lần chạy · {hours(data.seconds)} âm thanh</span>
          </p>
          <BandBar bands={data.bands} />
          <p className="text-sm text-muted">
            Lỗi giải mã {share(data.parts.decodeFail, data.parts.total)} đoạn · Whisper trống {share(data.parts.empty, data.parts.total)} · App lọc {share(data.appFiltered, data.segments)} câu
          </p>
          <p className="text-sm text-muted">
            Đèn theo từng lần chạy: <span style={{ color: HEALTH_COLOR.green }}>{data.runHealth.green} tốt</span> ·{" "}
            <span style={{ color: HEALTH_COLOR.yellow }}>{data.runHealth.yellow} cần chú ý</span> ·{" "}
            <span style={{ color: HEALTH_COLOR.red }}>{data.runHealth.red} kém</span>
          </p>
        </>
      )}
    </article>
  );
}

function DayChart({ rows }: { rows: BoardRow[] }) {
  const days = groupRollup(rows, (r) => r.day);
  if (!days.length) return null;
  const maxKnown = Math.max(1, ...days.map(({ rollup: r }) => r.bands.high + r.bands.check + r.bands.low));
  return (
    <div className="grid gap-1">
      <div className="flex h-40 items-end gap-1 overflow-x-auto" role="img" aria-label="Phân bố độ tin theo ngày">
        {days.map(({ key, rollup: r }) => {
          const known = r.bands.high + r.bands.check + r.bands.low;
          const scale = (known / maxKnown) * 100;
          const part = (n: number) => (known ? (n / known) * 100 : 0);
          return (
            <div key={key} className="flex h-full min-w-6 flex-1 flex-col justify-end" title={`${key}: ${r.runs} lần chạy, ${known} câu, độ tin ${pct(r.meanConfidence)}`}>
              <div className="flex w-full flex-col justify-end overflow-hidden rounded-md" style={{ height: `${scale}%`, background: "#2c4154" }}>
                <div style={{ height: `${part(r.bands.low)}%`, background: BAND_COLOR.low }} />
                <div style={{ height: `${part(r.bands.check)}%`, background: BAND_COLOR.check }} />
                <div style={{ height: `${part(r.bands.high)}%`, background: BAND_COLOR.high }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 overflow-x-auto text-[10px] text-muted">
        {days.map(({ key }) => (
          <span key={key} className="min-w-6 flex-1 text-center">
            {key.slice(8)}
          </span>
        ))}
      </div>
      <p className="text-sm text-muted">Chiều cao cột theo số câu đã chấm. Xanh là độ tin cao, vàng cần kiểm tra, đỏ thấp. Mảng đỏ dày hơn là chất lượng đang xấu đi.</p>
    </div>
  );
}

function GroupList({ title, items }: { title: string; items: Array<{ key: string; label: string; rollup: Rollup }> }) {
  if (!items.length) return null;
  return (
    <section className="grid content-start gap-2 rounded-2xl border border-line bg-bg p-3">
      <h3 className="font-semibold">{title}</h3>
      <ul className="grid gap-3">
        {items.map((item) => (
          <li key={item.key} className="grid gap-1">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-semibold">{item.label}</span>
              <span className="flex items-center gap-2 text-muted">
                <span className="inline-block h-3 w-3 rounded-full" style={{ background: HEALTH_COLOR[item.rollup.health] }} aria-hidden />
                {item.rollup.runs} lần · độ tin {pct(item.rollup.meanConfidence)}
              </span>
            </div>
            <BandBar bands={item.rollup.bands} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function QualityBoard() {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  const [fault, setFault] = useState("");

  useEffect(() => {
    let alive = true;
    setRows(null);
    void getQualityBoard({ data: days })
      .then((next) => {
        if (!alive) return;
        setRows(next.rows);
        setFault("");
      })
      .catch((error) => {
        if (!alive) return;
        setFault(error instanceof Error ? error.message : "Chưa mở được số liệu chất lượng.");
        setRows([]);
      });
    return () => {
      alive = false;
    };
  }, [days]);

  const view = useMemo(() => {
    const all = rows || [];
    const own = all.filter((r) => r.keySource === "own");
    const room = all.filter((r) => r.keySource === "room");
    const total = rollup(all);
    return {
      all,
      total,
      own: rollup(own),
      room: rollup(room),
      byLang: groupRollup(all, (r) => r.sourceLang).map((g) => ({ ...g, label: LANG_NAME[g.key] || g.key })),
      byModel: groupRollup(all, (r) => r.asrModel).map((g) => ({ ...g, label: g.key })),
      byVersion: groupRollup(all, (r) => r.appVersion)
        .sort((a, b) => compareVersionDesc(a.key, b.key))
        .slice(0, 6)
        .map((g) => ({ ...g, label: "Bản " + g.key })),
      hints: hintsFor(total),
    };
  }, [rows]);

  return (
    <section className="admin-wide grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">Chất lượng dịch</h2>
        <div className="flex gap-2">
          {([7, 30, 90] as const).map((n) => (
            <button
              key={n}
              type="button"
              className={"inline-flex min-h-11 items-center rounded-full px-3 text-sm " + (days === n ? "bg-accent font-semibold text-ink" : "border border-line")}
              onClick={() => setDays(n)}
            >
              {n} ngày
            </button>
          ))}
        </div>
      </div>
      {fault && <p className="text-sm text-danger">{fault}</p>}
      {rows === null && <p className="text-sm text-muted">Đang tải số liệu.</p>}
      {rows !== null && !fault && view.total.runs === 0 && (
        <p className="text-sm text-muted">Chưa có số liệu trong {days} ngày. Số liệu xuất hiện sau khi khách nhận dạng xong một phim bằng bản app này.</p>
      )}
      {rows !== null && view.total.runs > 0 && (
        <>
          <div className="tile-row">
            <SummaryCard title="Tổng cả hai" data={view.total} />
            <SummaryCard title="Key riêng của khách" data={view.own} />
            <SummaryCard title="Key của phòng" data={view.room} />
          </div>
          {view.hints.length > 0 && (
            <div className="grid gap-1 rounded-2xl border border-line bg-bg p-3 text-sm">
              <h3 className="font-semibold">Nên xem</h3>
              <ul className="grid gap-1">
                {view.hints.map((hint) => (
                  <li key={hint}>• {hint}</li>
                ))}
              </ul>
            </div>
          )}
          <section className="grid gap-2 rounded-2xl border border-line bg-bg p-3">
            <h3 className="font-semibold">Theo ngày</h3>
            <DayChart rows={view.all} />
          </section>
          <div className="tile-row">
            <GroupList title="Theo ngôn ngữ nguồn" items={view.byLang} />
            <GroupList title="Theo model Whisper" items={view.byModel} />
            <GroupList title="Theo phiên bản app" items={view.byVersion} />
          </div>
          <section className="grid gap-1 rounded-2xl border border-line bg-bg p-3 text-sm">
            <h3 className="font-semibold">Kiểm tra ngôn ngữ từng đoạn</h3>
            <p>
              {view.total.lang.runsOn} lần chạy bật · nghi lệch {view.total.lang.suspect} đoạn · gửi lại {view.total.lang.resent} · đổi sang bản mới {view.total.lang.swapped}
            </p>
            {view.total.lang.meanBefore !== null && view.total.lang.meanAfter !== null && (
              <p className="text-muted">
                Độ tin các đoạn đã đổi: {pct(view.total.lang.meanBefore)} → {pct(view.total.lang.meanAfter)}
              </p>
            )}
            <p className="font-semibold">{langCheckVerdict(view.total.lang)}</p>
          </section>
          <p className="text-sm text-muted">
            Số do trình duyệt của khách báo về, máy chủ không kiểm chứng được. Độ tin là mức Whisper tự tin vào chữ nó viết, không phải tỷ lệ đúng. Ngưỡng của đèn là ước lượng ban đầu, chưa chỉnh theo số đo thật. Chỉ có số, không có phụ đề, tên tệp, video, key hay tài khoản.
          </p>
        </>
      )}
    </section>
  );
}
