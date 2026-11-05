import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { ROOM_PLANS } from "@/lib/room-plans";

/** Đổi chuỗi này khi sửa nội dung điều khoản. Người dùng phải đồng ý lại. */
export const TERMS_VERSION = "2026-11-05.4";
const TERMS_KEY = "gterms";

export function EntryGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<"splash" | "terms" | "declined" | "app">("splash");

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => {
      let saved = "";
      try {
        saved = localStorage.getItem(TERMS_KEY) || "";
      } catch {
        saved = "";
      }
      setPhase(saved === TERMS_VERSION ? "app" : "terms");
    }, reduce ? 400 : 1700);
    return () => window.clearTimeout(timer);
  }, []);

  if (phase === "app") return children;
  if (phase === "declined") return <Declined onReview={() => setPhase("terms")} />;
  if (phase === "terms") return <Terms onAccept={() => acceptTerms(setPhase)} onDecline={() => setPhase("declined")} />;
  return <Splash />;
}

function acceptTerms(setPhase: (phase: "app") => void) {
  try {
    localStorage.setItem(TERMS_KEY, TERMS_VERSION);
  } catch {
    // Vẫn cho vào lần này. Lần sau sẽ hỏi lại nếu máy không lưu được.
  }
  setPhase("app");
}

function Mark({ title }: { title?: string }) {
  return (
    <svg className="gate-mark" viewBox="0 0 80 80" aria-hidden={title ? undefined : true} role={title ? "img" : undefined}>
      {title ? <title>{title}</title> : null}
      <rect className="gate-plate" x="6" y="16" width="68" height="48" rx="8" />
      <rect className="gate-frame" x="6" y="16" width="68" height="48" rx="8" />
      <path className="gate-play" d="M34 30.5v19l16-9.5-16-9.5z" />
    </svg>
  );
}

function Splash() {
  return (
    <main className="gate-screen gate-splash" aria-live="polite">
      <Mark title="TyZo Sub" />
      <p className="gate-kicker">Phòng chiếu</p>
      <h1 className="gate-title">TyZo Sub</h1>
      <p className="gate-wait">Đang mở phòng dịch</p>
    </main>
  );
}

function Terms({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) {
  const [read, setRead] = useState(false);
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();

  function agree() {
    try {
      localStorage.setItem(TERMS_KEY, TERMS_VERSION);
    } catch {
      // Vẫn cho đi tiếp lần này. Lần sau sẽ hỏi lại nếu máy không lưu được.
    }
    if (!isPending && user && !user.isDevFallback) {
      onAccept();
      return;
    }
    void navigate({ to: "/login" });
  }

  return (
    <main className="gate-screen gate-doc">
      <header className="gate-doc-head">
        <Mark />
        <div>
          <p className="gate-kicker">Phòng chiếu TyZo Sub</p>
          <h1 className="text-xl font-semibold">Điều khoản sử dụng</h1>
          <p className="text-sm text-muted">Phiên bản {TERMS_VERSION}. Đồng ý mới được dùng. Không đồng ý thì dừng ở đây.</p>
        </div>
      </header>
      <article className="gate-scroll">
        <h2>Tóm tắt</h2>
        <table className="gate-table">
          <thead>
            <tr>
              <th>Việc</th>
              <th>Ai chịu</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Nhận dạng lời, dịch, chiếu phụ đề, thuyết minh, xuất file</td>
              <td>Phòng cung cấp công cụ</td>
            </tr>
            <tr>
              <td>Key Groq và cước Groq</td>
              <td>Bạn</td>
            </tr>
            <tr>
              <td>Quyền của video và tiếng đưa vào</td>
              <td>Bạn</td>
            </tr>
            <tr>
              <td>Xem lại bản dịch trước khi đăng hoặc phát</td>
              <td>Bạn</td>
            </tr>
            <tr>
              <td>Đúng hết câu, đúng ý, đúng giọng</td>
              <td>Không cam kết</td>
            </tr>
          </tbody>
        </table>

        <h2>Bảng giá</h2>
        <p>Đăng ký chưa nạp là dùng thử: 1 tệp, tối đa 10 phút, xem đủ chức năng, không xuất file Vietsub. Gói đã mua thì trong hạn không giới hạn số tệp.</p>
        <table className="gate-table">
          <thead>
            <tr>
              <th>Gói</th>
              <th>Giá</th>
              <th>Quyền</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Dùng thử</td>
              <td>0 đ</td>
              <td>1 tệp, 10 phút, không xuất file</td>
            </tr>
            {ROOM_PLANS.map((plan) => (
              <tr key={plan.id}>
                <td>{plan.name}</td>
                <td>{new Intl.NumberFormat("vi-VN").format(plan.price)} đ</td>
                <td>Không giới hạn số tệp trong hạn, được xuất file</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2>1. Phòng này làm gì</h2>
        <p>
          Phòng chiếu TyZo Sub là công cụ chạy trên trình duyệt. Bạn chọn file video hoặc tiếng, dán key Groq của chính bạn. Phòng nhận dạng lời, dịch sang tiếng Việt, chiếu phụ đề trên video, có thể đọc thuyết minh, và xuất file phụ đề .srt.
        </p>
        <p>Phòng cho thuê theo gói ngày, tuần hoặc tháng. Key Groq và cước Groq vẫn là của bạn. Chưa thu qua ngân hàng.</p>

        <h2>2. Điều kiện để dùng</h2>
        <p>Bạn tự chịu trách nhiệm khi đưa nội dung vào. Bạn phải có quyền dùng video và tiếng đó. Key Groq là của bạn. Groq tính cước cho tài khoản của bạn, không phải phí của phòng.</p>
        <p>Bạn phải đọc và bấm đồng ý bản điều khoản đang hiện. Không đồng ý thì không mở được phòng dịch.</p>

        <h2>3. Phòng không cam kết</h2>
        <p>
          Không cam kết nhận dạng hết câu, dịch đúng ý, giữ đúng tên hay giọng nam nữ, hoặc không mất câu. Kết quả là bản để bạn xem và sửa. Bạn tự kiểm tra trước khi đăng, phát hoặc giao cho người khác.
        </p>
        <p>Key sai, hết hạn mức Groq, mạng lỗi, file hỏng hoặc trình duyệt chặn tiếng có thể làm một lần chạy thất bại. Phòng không bồi thường cho các lần đó, vì phòng không thu tiền sử dụng.</p>
        <p>Phòng không phải Groq, không phải nhà sản xuất video, và không phải nơi lưu phim.</p>

        <h2>4. Dữ liệu đi những đâu</h2>
        <p>
          Key Groq, tên phim, ghi chú, thuật ngữ bạn thêm, giọng đã khóa và lần đồng ý điều khoản được lưu trên máy bạn, trong trình duyệt. Xóa dữ liệu trang là mất các mục đó.
        </p>
        <p>Lời thoại được gửi tới Groq để nhận dạng và dịch, theo điều khoản của Groq. File video xử lý trên máy bạn.</p>
        <p>
          Khi bật thuyết minh Neural, câu chữ được gửi qua máy chủ của phòng tới dịch vụ đọc giọng. Giọng máy của trình duyệt đọc trên thiết bị của bạn. Orpheus dùng key Groq của bạn.
        </p>

        <h2>5. Phần mỗi bên chịu</h2>
        <p>Bạn chịu nội dung đưa vào và cách bạn dùng bản dịch, file phụ đề, hoặc tiếng đọc.</p>
        <p>
          Phòng chỉ cung cấp công cụ. Phòng không chịu thiệt hại gián tiếp do bản dịch sai, mất câu, hay key bị người khác thấy vì bạn để họ dùng máy của bạn.
        </p>
        <p>Điều khoản này không xóa trách nhiệm của phòng nếu phòng cố ý gây hại.</p>

        <h2>6. Khi điều khoản đổi</h2>
        <p>
          Sửa nội dung điều khoản thì số phiên bản đổi. Bản mới hiện lại lúc bạn mở phòng. Bạn phải đồng ý bản mới thì mới dùng tiếp. Không đồng ý thì dùng bản cũ cũng không được.
        </p>

        <h2>7. Ngừng dùng</h2>
        <p>Bạn có thể bấm không đồng ý và rời đi. Phần đã lưu trên máy vẫn còn đến khi bạn xóa dữ liệu của trang.</p>

        <h2>8. Khi nào bị khóa hoặc bị cấm</h2>
        <p className="gate-key">Hết hạn gói, hết lượt dùng thử, dịch chưa đúng, hoặc đăng nhập sai không phải lý do để khóa hay cấm. Những lúc đó bạn vẫn đăng nhập được.</p>
        <p className="gate-label gate-label-lock">Khóa</p>
        <p>Bạn vẫn vào phòng để gửi yêu cầu xem lại, nhưng không dịch và không xuất file.</p>
        <p className="gate-label gate-label-ban">Cấm</p>
        <p>Bạn không đăng nhập được. Người bị cấm vẫn gửi được yêu cầu từ trang không cần đăng nhập.</p>
        <p className="gate-key">Mỗi lần khóa hoặc cấm đều có lý do được ghi lại.</p>
        <p className="gate-label gate-label-lock">Có thể bị khóa nếu</p>
        <ul className="gate-points">
          <li>Một tài khoản đang hạn được nhiều người dùng chung.</li>
          <li>Tạo nhiều tài khoản chỉ để lấy thêm lượt dùng thử.</li>
          <li>Gửi yêu cầu hỗ trợ lặp lại để gây rối.</li>
        </ul>
        <p className="gate-label gate-label-ban">Có thể bị cấm nếu</p>
        <ul className="gate-points gate-points-ban">
          <li>Đưa vào phòng nội dung khai thác trẻ em.</li>
          <li>Cố tình tấn công hoặc làm quá tải trang.</li>
          <li>Đưa chứng từ thanh toán giả.</li>
          <li>Bán lại tài khoản hoặc bán lại phòng như dịch vụ của mình.</li>
          <li>Tiếp tục đưa nội dung không có quyền sau khi đã được báo.</li>
        </ul>
        <p className="gate-key">Gỡ khóa hoặc gỡ cấm không xóa lịch sử xử lý.</p>
      </article>
      <footer className="gate-actions">
        <label className="flex items-start gap-2 text-sm">
          <input
            className="mt-1 size-4"
            type="checkbox"
            checked={read}
            onChange={(event) => setRead(event.target.checked)}
          />
          Tôi đã đọc điều khoản phiên bản {TERMS_VERSION} và muốn dùng phòng dịch.
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="min-tap rounded-xl bg-accent px-4 text-sm font-semibold text-ink disabled:opacity-40" disabled={!read} onClick={agree}>
            Đồng ý và tiếp tục
          </button>
          <button type="button" className="min-tap rounded-xl border border-line px-4 text-sm" onClick={onDecline}>
            Không đồng ý
          </button>
        </div>
      </footer>
    </main>
  );
}

function Declined({ onReview }: { onReview: () => void }) {
  return (
    <main className="gate-screen gate-splash">
      <Mark />
      <h1 className="gate-title">Chưa vào phòng</h1>
      <p className="gate-wait">Bạn chưa đồng ý điều khoản nên không dùng được phòng dịch.</p>
      <button type="button" className="min-tap rounded-xl bg-accent px-4 text-sm font-semibold text-ink" onClick={onReview}>
        Xem lại điều khoản
      </button>
    </main>
  );
}
