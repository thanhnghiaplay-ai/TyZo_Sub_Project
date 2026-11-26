/**
 * Luật phụ thuộc giữa các tệp của TyZo (dependency-cruiser). Chạy: npm run tools:deps (xem docs/CONG-CU.md).
 * error = sai kiến trúc thật, phải sửa. warn = nên xem, không chặn.
 */
module.exports = {
  forbidden: [
    {
      name: "khong-vong-tron",
      comment: "Hai tệp import vòng lẫn nhau: dễ lỗi thứ tự nạp, khó tách. Nên gỡ dần.",
      severity: "warn",
      from: {},
      to: { circular: true },
    },
    {
      name: "khong-import-test",
      comment: "Mã chạy thật không được import tệp test.",
      severity: "error",
      from: { pathNot: "\\.test\\.tsx?$" },
      to: { path: "\\.test\\.tsx?$" },
    },
    {
      name: "giao-dien-khong-import-may-chu",
      comment: "Tệp giao diện (components) không import thẳng tệp *.server.ts (lộ mã máy chủ, key ra trình duyệt).",
      severity: "error",
      from: { path: "^src/components/" },
      to: { path: "\\.server\\.tsx?$", dependencyTypesNot: ["dynamic-import"] },
    },
    {
      name: "lib-khong-import-giao-dien",
      comment: "src/lib là lõi, không phụ thuộc vào giao diện (src/components).",
      severity: "warn",
      from: { path: "^src/lib/", pathNot: "\\.test\\.tsx?$" },
      to: { path: "^src/components/" },
    },
    {
      name: "khong-tim-thay",
      comment: "Import trỏ tới tệp không có (thường sau khi dời hoặc xóa tệp).",
      severity: "error",
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: "tep-mo-coi",
      comment: "Tệp không ai import. Kiểm tra tay trước khi xóa (có thể được gọi theo đường dẫn, từ route hay script).",
      severity: "warn",
      from: {
        orphan: true,
        pathNot: ["\\.test\\.tsx?$", "^src/routes/", "\\.d\\.ts$", "^src/routeTree\\.gen\\.ts$", "^src/(router|styles)\\."],
      },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: ["^src/routeTree\\.gen\\.ts$"] },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: { exportsFields: ["exports"], conditionNames: ["import", "require", "node", "default"], extensions: [".ts", ".tsx", ".js", ".mjs", ".cjs", ".json"] },
  },
};
