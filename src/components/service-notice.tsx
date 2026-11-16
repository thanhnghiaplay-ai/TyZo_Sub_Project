import { Link } from "@tanstack/react-router";
import { Icon } from "@/components/ui/icon";
import { SERVICE_LABEL, SERVICE_STATE_LABEL, untilLabel, type ServiceEntry, type ServiceGroup, type ServiceStatus } from "@/lib/service-status";


const CHOICES: { group: ServiceGroup; to: "/" | "/dich-truc-tiep"; hint: string }[] = [
  { group: "normal", to: "/", hint: "Chọn tệp video hoặc âm thanh rồi dịch" },
  { group: "live", to: "/dich-truc-tiep", hint: "Nghe và dịch ngay khi đang nói" },
];

/** Hai nhóm dịch đứng cạnh nhau, mỗi nhóm có chấm trạng thái. Bấm để sang nhóm kia; nhóm đang bảo trì vẫn mở được để đọc thông báo. */
export function ServiceSwitch({ current, status }: { current: ServiceGroup; status: ServiceStatus }) {
  return (
    <nav aria-label="Chọn nhóm dịch" className="grid grid-cols-2 gap-2" data-service-switch>
      {CHOICES.map(({ group, to, hint }) => {
        const down = status[group].state === "maintenance";
        const here = group === current;
        return (
          <Link
            key={group}
            to={to}
            aria-current={here ? "page" : undefined}
            className={
              "grid min-h-16 content-center gap-0.5 rounded-[var(--radius-card)] border p-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent " +
              (here ? "border-accent bg-accent/10" : "border-line bg-card hover:border-accent")
            }
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <span className={"door-dot " + (down ? "door-dot-closed" : "door-dot-open")} aria-hidden="true" />
              {SERVICE_LABEL[group]}
              <span className="sr-only">: {SERVICE_STATE_LABEL[status[group].state]}</span>
            </span>
            <span className={"text-xs " + (down ? "text-warning" : "text-muted")}>{down ? "Đang bảo trì" : hint}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Khung báo nhóm đang bảo trì: lời nhắn của Chủ, giờ dự kiến mở lại nếu có. Nhóm hoạt động thì không vẽ gì. */
export function MaintenanceNotice({ group, entry, running = false }: { group: ServiceGroup; entry: ServiceEntry; running?: boolean }) {
  if (entry.state !== "maintenance") return null;
  const eta = entry.until && entry.until > Date.now() ? untilLabel(entry.until) : "";
  return (
    <section role="status" className="grid gap-1 rounded-[var(--radius-card)] border border-warning bg-card p-3 text-sm" data-maintenance={group}>
      <p className="flex items-center gap-2 font-semibold text-warning">
        <Icon slot="ui.repair" className="size-4 shrink-0" />
        {SERVICE_LABEL[group]} đang bảo trì
      </p>
      <p>{entry.note || "Tạm thời chưa nhận lượt mới. Bạn vui lòng quay lại sau."}</p>
      {eta && <p className="text-xs text-muted">Dự kiến mở lại lúc {eta}.</p>}
      {running && <p className="text-xs text-muted">Lượt đang chạy vẫn chạy nốt, không bị cắt.</p>}
    </section>
  );
}
