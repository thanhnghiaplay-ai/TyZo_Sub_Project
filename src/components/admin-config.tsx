import { useState, type ReactNode } from "react";
import { CONFIG_PAGES, DEFAULT_CONFIG_PAGE, type ConfigPageId } from "@/lib/admin-config-pages";
import { Fold } from "@/components/admin-fold";
import { GiayPackBoard } from "@/components/giay-pack-board";
import { LiveShowBoard } from "@/components/live-show-board";
import { LiveWorkspaceBoard } from "@/components/live-workspace-board";
import { PaySettings } from "@/components/pay-settings";
import { PolishModelBoard } from "@/components/polish-model-board";
import { R2Board } from "@/components/r2-board";
import { ProviderKeyBoards } from "@/components/provider-key-board";
import { RoomPlansView } from "@/components/room-plans-view";
import { RentShowBoard } from "@/components/rent-show-board";
import { RunDeskBoard } from "@/components/run-desk-board";
import { ServicePackBoard } from "@/components/service-pack-board";
import { ServiceStatusBoard } from "@/components/service-status-board";
import { SupportBoard } from "@/components/support-board";

/** Một trang con: chỉ ẩn khi không chọn, không gỡ khỏi trang, nên ô đang nhập dở không mất khi chuyển qua lại. */
function Page({ id, current, children }: { id: ConfigPageId; current: ConfigPageId; children: ReactNode }) {
  return (
    <div className="admin-grid admin-wide" style={id === current ? undefined : { display: "none" }}>
      {children}
    </div>
  );
}

/** Tab Cấu hình của Chủ: thanh chọn ngang + các trang con. Cùng các khối như trước, chỉ sắp lại cho ngắn. */
export function ConfigTab() {
  const [page, setPage] = useState<ConfigPageId>(DEFAULT_CONFIG_PAGE);
  return (
    <>
      <div className="admin-wide flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Trang con Cấu hình">
        {CONFIG_PAGES.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={page === item.id}
            className={"min-tap shrink-0 rounded-full px-4 text-sm " + (page === item.id ? "bg-accent font-semibold text-ink" : "border border-line")}
            onClick={() => setPage(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <Page id="trang-thai" current={page}>
        <ServiceStatusBoard />
        <SupportBoard />
      </Page>
      <Page id="nha-cung-cap" current={page}>
        <ProviderKeyBoards />
        <R2Board />
      </Page>
      <Page id="gia" current={page}>
        <RunDeskBoard owner part="price" />
        <Fold title="Giá thuê phòng" hint="Chủ chỉnh được">
          <RoomPlansView />
        </Fold>
      </Page>
      <Page id="goi" current={page}>
        <GiayPackBoard />
        <Fold title="Gói dịch" hint="Mỗi việc chọn một nhà và một model">
          <ServicePackBoard />
        </Fold>
        <Fold title="Model trau chuốt bản dịch" hint="Có kiểm duyệt cho thể loại thường, không kiểm duyệt cho 18+">
          <PolishModelBoard />
        </Fold>
      </Page>
      <Page id="thue-phong" current={page}>
        <Fold title="Model khách được chọn khi thuê phòng" hint="Khách dùng key của họ">
          <RentShowBoard />
        </Fold>
      </Page>
      <Page id="truc-tiep" current={page}>
        <LiveWorkspaceBoard />
        <LiveShowBoard />
      </Page>
      <Page id="cong-nap" current={page}>
        <Fold title="Cổng nạp" hint="Sepay, Casso và tài khoản nhận tiền" wide>
          <PaySettings />
        </Fold>
      </Page>
    </>
  );
}
