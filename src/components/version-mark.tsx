import { APP_VERSION } from "@/lib/app-version";

export function VersionMark() {
  return (
    <p className="version-mark" title="Số cuối đổi khi sửa chữ. Số giữa đổi khi thêm chức năng nhỏ. Số đầu đổi khi thêm chức năng lớn.">
      v{APP_VERSION}
    </p>
  );
}
