import { APP_VERSION, versionKind } from "@/lib/app-version";

export function VersionMark() {
  const kind = versionKind();
  return (
    <p
      className="version-mark"
      title="Số cuối đổi khi sửa chữ. Số giữa đổi khi thêm chức năng nhỏ. Số đầu đổi khi thêm chức năng lớn."
    >
      <span>v{APP_VERSION}</span>
      <span className="version-kind">{kind}</span>
    </p>
  );
}
