import { ProviderKeyBoard } from "@/components/provider-key-board";
import { PROVIDER_IDS } from "@/lib/sub/provider";

/**
 * Mục "Nhà cung cấp" của Admin (tab Cấu hình, chỉ Chủ). Sinh từ bảng PROVIDERS: nhà mới thêm vào bảng thì có ngay ô key,
 * không phải sửa file này. Giá, gói và model thuê phòng còn ở các ô riêng của chúng.
 */
export function ProviderDesk() {
  return (
    <>
      {PROVIDER_IDS.map((id) => (
        <ProviderKeyBoard key={id} provider={id} />
      ))}
    </>
  );
}
