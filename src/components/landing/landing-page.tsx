import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Link } from "@tanstack/react-router";
import { BrandMark } from "@/components/brand-mark";
import { ANDROID_APK_LATEST, ANDROID_APP } from "@/lib/app-link";
import { dong } from "@/lib/money-format";
import { TRIAL_BYTES, TRIAL_FILES, TRIAL_MINUTES, type RoomPlanId } from "@/lib/room-plans";
import { useRoomPlans } from "@/lib/use-room-plans";
import landingCss from "./landing.css?raw";

/**
 * Trang giới thiệu (landing). Hiện ở /gioi-thieu và ở "/" cho khách chưa đăng nhập.
 * Mọi con số về giá và dùng thử lấy từ hằng số của app (không chép số vào chữ); chữ quảng cáo bám Điều khoản và Chính sách:
 * công cụ AI theo yêu cầu, không lưu video, không cam kết đúng hết câu, người dùng tự chịu quyền với nội dung.
 * Mọi tên lớp CSS có tiền tố "lp-" và nằm trong khung .lp để không đụng CSS của app.
 */

const DEMO = [
  { l: "中文 → Tiếng Việt", s: "师父，山下的李家庄出事了。", v: "Sư phụ, Lý gia trang dưới núi xảy ra chuyện rồi." },
  { l: "한국어 → Tiếng Việt", s: "헐, 실화냐? 나 지금 소름 돋았어.", v: "Trời, thật hả? Mình nổi da gà luôn rồi." },
  { l: "日本語 → Tiếng Việt", s: "ねえねえ、これ見た？マジでやばいんだけど！", v: "Ê ê, xem cái này chưa? Đỉnh thật sự luôn!" },
  { l: "English → Tiếng Việt", s: "Anyway, dinner's on me. Pick quick!", v: "Dù sao tối nay mình bao. Chọn nhanh lên!" },
  { l: "中文 → Tiếng Việt", s: "反正今晚我请客，吃烧烤还是火锅？", v: "Tối nay mình mời, ăn nướng hay lẩu đây?" },
] as const;

const PHONE = [
  ["별거 아니야, 내가 해결할게", "Chuyện nhỏ thôi, để mình lo"],
  ["我真的不知道该怎么办", "Mình thật sự không biết phải làm sao"],
  ["絶対に諦めない！", "Tuyệt đối không bỏ cuộc!"],
] as const;

const MARQUEE = [
  "🇨🇳|Tiếng Trung → Việt",
  "🇰🇷|Tiếng Hàn → Việt",
  "🇯🇵|Tiếng Nhật → Việt",
  "🇬🇧|Tiếng Anh → Việt",
  "🎞️|Tệp video, âm thanh trên máy",
  "🔗|Link tệp trực tiếp",
  "🖥️|Âm thanh tab trình duyệt",
  "🎙️|Micro",
  "📱|Ứng dụng Android",
];

const PLAN_TAG: Record<RoomPlanId, string> = {
  ngay: "Dùng gọn trong một buổi",
  tuan: "Hợp để làm cả vài tập, cả bộ",
  thang: "Rẻ nhất tính theo ngày",
};

const TICK = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
    <path d="M5 12l5 5L19 7" />
  </svg>
);

const ARROW = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

function goTo(event: MouseEvent<HTMLAnchorElement>, id: string) {
  event.preventDefault();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const target = id === "top" ? null : document.getElementById(id);
  const root = event.currentTarget.closest(".lp");
  if (target) target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  else if (root) root.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
}

export function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const plans = useRoomPlans();
  const [demo, setDemo] = useState<(typeof DEMO)[number]>(DEMO[0]);
  const [typed, setTyped] = useState("");
  const [phone, setPhone] = useState(0);

  // Hiện dần khi cuộn. Chỉ ẩn nội dung sau khi script chạy, nên script lỗi thì trang vẫn đọc được.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>(".lp-reveal"));
    if (typeof IntersectionObserver === "undefined") return;
    root.classList.add("lp-js");
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("lp-in");
          io.unobserve(entry.target);
        }),
      { root, threshold: 0.12 },
    );
    items.forEach((item) => io.observe(item));
    return () => {
      io.disconnect();
      root.classList.remove("lp-js");
    };
  }, []);

  // Phụ đề mẫu gõ dần trong khung phim.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let alive = true;
    let timer = 0;
    let index = 0;
    const play = () => {
      if (!alive) return;
      const line = DEMO[index % DEMO.length];
      index += 1;
      setDemo(line);
      if (reduce) {
        setTyped(line.v);
        timer = window.setTimeout(play, 4000);
        return;
      }
      setTyped("");
      let count = 0;
      const tick = () => {
        if (!alive) return;
        count += 1;
        setTyped(line.v.slice(0, count));
        timer = window.setTimeout(count >= line.v.length ? play : tick, count >= line.v.length ? 2400 : 38);
      };
      timer = window.setTimeout(tick, 38);
    };
    timer = window.setTimeout(play, 600);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, []);

  // Phụ đề trong khung điện thoại đổi qua lại.
  useEffect(() => {
    const timer = window.setInterval(() => setPhone((n) => (n + 1) % PHONE.length), 3200);
    return () => window.clearInterval(timer);
  }, []);

  const cheapest = plans[0];
  const trialMb = Math.round(TRIAL_BYTES / (1024 * 1024));

  return (
    <div className="lp" id="top" ref={rootRef}>
      <style dangerouslySetInnerHTML={{ __html: landingCss }} />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap" />

      <header>
        <div className="lp-wrap lp-nav">
          <a className="lp-logo" href="#top" onClick={(event) => goTo(event, "top")} aria-label="TyZo Sub, về đầu trang">
            <BrandMark small />
            TyZo Sub
          </a>
          <nav className="lp-nav-links" aria-label="Mục trên trang">
            <a href="#cach-dung" onClick={(event) => goTo(event, "cach-dung")}>Cách dùng</a>
            <a href="#tinh-nang" onClick={(event) => goTo(event, "tinh-nang")}>Tính năng</a>
            <a href="#ung-dung" onClick={(event) => goTo(event, "ung-dung")}>Ứng dụng</a>
            <a href="#gia" onClick={(event) => goTo(event, "gia")}>Bảng giá</a>
          </nav>
          <div className="lp-nav-in">
            <Link to="/login" className="lp-btn lp-btn-ghost">Đăng nhập</Link>
            <Link to="/login" className="lp-btn lp-btn-gold">Dùng thử</Link>
          </div>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="lp-hero">
          <div className="lp-glow lp-a" />
          <div className="lp-glow lp-b" />
          <div className="lp-wrap lp-hero-grid">
            <div>
              <span className="lp-badge"><span className="lp-dot" /> Công cụ phụ đề AI · Dịch trực tiếp theo thời gian thực</span>
              <h1>
                <span className="lp-grad">Vietsub tự động</span> bằng AI cho video Trung, Hàn, Nhật, Anh
              </h1>
              <p className="lp-lead">
                TyZo Sub là công cụ SaaS tạo phụ đề video bằng trí tuệ nhân tạo (AI): nhận dạng lời thoại (ASR), dịch sang tiếng Việt bằng mô hình ngôn ngữ lớn (LLM) theo ngữ cảnh toàn bộ nội dung,
                xuất phụ đề <b>SRT, VTT, TXT</b>. Cần phụ đề ngay khi đang nghe? Bật <b>Dịch trực tiếp</b> để chữ hiện nổi theo thời gian thực.
              </p>
              <div className="lp-cta-row">
                <Link to="/login" className="lp-btn lp-btn-gold lp-pulse">
                  Dùng thử miễn phí
                  {ARROW}
                </Link>
                <a className="lp-btn lp-btn-ghost" href="#cach-dung" onClick={(event) => goTo(event, "cach-dung")}>Xem cách dùng</a>
              </div>
              <div className="lp-trust">
                <span>{TICK}Chạy ngay trên trình duyệt, không cần cài</span>
                <span>{TICK}Video xử lý trên máy bạn, TyZo Sub không lưu video</span>
                {cheapest ? <span>{TICK}Từ {dong(cheapest.price)} / {cheapest.name}</span> : null}
              </div>
            </div>

            <div className="lp-player-wrap lp-reveal">
              <div className="lp-player" role="img" aria-label="Minh họa phụ đề dịch trực tiếp">
                <div className="lp-scene" />
                <div className="lp-silhouette lp-s1" />
                <div className="lp-silhouette lp-s2" />
                <div className="lp-topbar">
                  <span className="lp-live"><span className="lp-dot" />Đang dịch</span>
                  <span className="lp-lang">{demo.l}</span>
                </div>
                <div className="lp-subs">
                  <div className="lp-sub-src">{demo.s}</div>
                  <div className="lp-sub-vi"><span>{typed}</span><span className="lp-caret" /></div>
                </div>
                <div className="lp-progress"><i /></div>
              </div>
              <div className="lp-float-card lp-fc1">
                <span className="lp-ic" style={{ background: "rgba(61,214,195,.15)", color: "var(--teal)" }}>⚡</span>
                <div><b>Độ trễ thấp</b><small>Dịch trực tiếp</small></div>
              </div>
              <div className="lp-float-card lp-fc2">
                <span className="lp-ic" style={{ background: "rgba(231,182,58,.15)", color: "var(--gold)" }}>🎬</span>
                <div><b>Xuất SRT · VTT · TXT</b><small>Dùng với trình phát của bạn</small></div>
              </div>
            </div>
          </div>

          <div className="lp-marquee" aria-hidden="true">
            <div className="lp-track">
              {[...MARQUEE, ...MARQUEE].map((item, index) => {
                const [icon, text] = item.split("|");
                return (
                  <span key={`${item}-${index}`}>
                    {icon} <em>{text}</em>
                  </span>
                );
              })}
            </div>
          </div>
        </section>

        {/* NỖI ĐAU */}
        <section>
          <div className="lp-wrap lp-center lp-reveal">
            <div className="lp-eyebrow">Bạn có quen cảnh này?</div>
            <h2>Có video rồi, nhưng <span className="lp-gold">thiếu phụ đề tiếng Việt</span></h2>
            <p className="lp-sub">Làm phụ đề bằng tay mất hàng giờ. Dịch từng chữ thì đọc không ra ý.</p>
            <div className="lp-pain">
              <div><div className="lp-x">⏳ Tốn thời gian</div><p>Gõ từng dòng, canh từng mốc giờ cho một tệp video dài: việc của cả buổi tối.</p></div>
              <div><div className="lp-x">🤯 Dịch máy rời rạc</div><p>Tên nhân vật mỗi câu một kiểu, xưng hô lộn xộn, đọc mà muốn tắt đi.</p></div>
              <div><div className="lp-x">🚫 Không có sẵn phụ đề</div><p>Video riêng, buổi phát trực tiếp, nội dung ít người làm: không ai làm phụ đề cho bạn.</p></div>
            </div>
          </div>
        </section>

        {/* HAI CÁCH DÙNG */}
        <section id="cach-dung" style={{ paddingTop: 0 }}>
          <div className="lp-wrap">
            <div className="lp-center lp-reveal">
              <div className="lp-eyebrow">Hai cách, một kết quả</div>
              <h2>Có sẵn video hay đang nghe trực tiếp, <span className="lp-grad">đều có Vietsub</span></h2>
            </div>
            <div className="lp-modes">
              <div className="lp-mode lp-reveal">
                <span className="lp-tag">🎞️ Có sẵn video</span>
                <h3>Làm phụ đề từ tệp</h3>
                <p>Chọn tệp video hoặc âm thanh trên máy, hoặc dán link tệp trực tiếp. AI nhận dạng toàn bộ lời thoại, dịch sang tiếng Việt và hiện phụ đề đồng bộ với video.</p>
                <ul>
                  <li>Nguồn tiếng Trung, Hàn, Nhật, Anh, dịch sang tiếng Việt</li>
                  <li>Phân tích ngữ cảnh trước khi dịch: xưng hô và tên riêng nhất quán</li>
                  <li>Xem ngay trên trang, sửa từng dòng, gói trả phí tải SRT, VTT, TXT</li>
                </ul>
                <div className="lp-big">01</div>
              </div>
              <div className="lp-mode lp-reveal">
                <span className="lp-tag">⚡ Đang nghe trực tiếp</span>
                <h3>Dịch trực tiếp</h3>
                <p>Thu âm thanh tab trình duyệt hoặc micro trên web, hay tiếng điện thoại đang phát trên ứng dụng Android. Chữ gốc và bản dịch hiện ngay khi đang nói.</p>
                <ul>
                  <li>Phụ đề nổi như phụ đề phim, chỉnh cỡ chữ và nền</li>
                  <li>Lọc cho giọng nói: bớt nhạc nền, nhận dạng lời thoại rõ hơn</li>
                  <li>Tạm dừng, lịch sử phiên dùng chung giữa web và ứng dụng</li>
                </ul>
                <div className="lp-big">02</div>
              </div>
            </div>
          </div>
        </section>

        {/* BA BƯỚC */}
        <section style={{ paddingTop: 0 }}>
          <div className="lp-wrap">
            <div className="lp-center lp-reveal">
              <div className="lp-eyebrow">Chỉ 3 bước</div>
              <h2>Từ video đến Vietsub, gọn gàng</h2>
            </div>
            <div className="lp-steps">
              <div className="lp-step lp-reveal"><h3>Chọn nguồn</h3><p>Chọn tệp trên máy, dán link tệp trực tiếp, hoặc bật Dịch trực tiếp.</p></div>
              <div className="lp-step lp-reveal"><h3>AI nhận dạng và dịch</h3><p>Nhận dạng lời thoại, phân tích ngữ cảnh, dịch sang tiếng Việt tự nhiên.</p></div>
              <div className="lp-step lp-reveal"><h3>Xem, sửa, tải về</h3><p>Xem trên trang, sửa từng dòng, gói trả phí tải file phụ đề.</p></div>
            </div>
          </div>
        </section>

        {/* TRƯỚC / SAU */}
        <section style={{ paddingTop: 0 }}>
          <div className="lp-wrap">
            <div className="lp-center lp-reveal">
              <div className="lp-eyebrow">Khác biệt nằm ở ngữ cảnh</div>
              <h2>Không dịch từng chữ, <span className="lp-gold">dịch theo ngữ cảnh</span></h2>
            </div>
            <div className="lp-compare">
              <div className="lp-cmp lp-bad lp-reveal">
                <h3>❌ Dịch sát từng chữ</h3>
                <div className="lp-line"><small>我靠！这个视频直接破防了</small><span className="lp-strike">Tôi dựa! Video này trực tiếp phá phòng thủ rồi</span></div>
                <div className="lp-line"><small>内卷这么厉害，我真想躺平</small><span className="lp-strike">Cuộn trong lợi hại, tôi thật muốn nằm phẳng</span></div>
              </div>
              <div className="lp-cmp lp-good lp-reveal">
                <h3>✅ Hướng tiếp cận của TyZo Sub</h3>
                <div className="lp-line"><small>我靠！这个视频直接破防了</small>Trời ơi! Video này làm mình sụp đổ luôn</div>
                <div className="lp-line"><small>内卷这么厉害，我真想躺平</small>Cạnh tranh khốc liệt thế này, mình chỉ muốn nằm yên thôi</div>
              </div>
            </div>
            <p className="lp-cmp-note">Ví dụ minh họa cho cách dịch theo ngữ cảnh. Kết quả thực tế phụ thuộc chất lượng âm thanh và nội dung; TyZo Sub không cam kết đúng hết câu, đúng ý, đúng giọng.</p>
          </div>
        </section>

        {/* TÍNH NĂNG */}
        <section id="tinh-nang" style={{ paddingTop: 0 }}>
          <div className="lp-wrap">
            <div className="lp-center lp-reveal">
              <div className="lp-eyebrow">Tính năng</div>
              <h2>Bộ công cụ phụ đề AI <span className="lp-grad">đủ đầy</span></h2>
            </div>
            <div className="lp-feats">
              <div className="lp-feat lp-reveal"><div className="lp-ic" style={{ background: "rgba(231,182,58,.14)" }}>🧠</div><h3>Phân tích ngữ cảnh trước khi dịch</h3><p>Đọc hiểu nội dung, nhân vật và quan hệ để xưng hô nhất quán từ đầu đến cuối.</p></div>
              <div className="lp-feat lp-reveal"><div className="lp-ic" style={{ background: "rgba(61,214,195,.14)" }}>📌</div><h3>Thuật ngữ và tên riêng</h3><p>Thêm tên nhân vật, chiêu thức, địa danh: bản dịch viết đúng như bạn đặt.</p></div>
              <div className="lp-feat lp-reveal"><div className="lp-ic" style={{ background: "rgba(142,183,238,.16)" }}>🎭</div><h3>Văn phong theo thể loại</h3><p>Hơn 20 thể loại như cổ trang, tiên hiệp, ngôn tình, hành động, hài: giọng văn đổi cho hợp.</p></div>
              <div className="lp-feat lp-reveal"><div className="lp-ic" style={{ background: "rgba(255,92,108,.14)" }}>🎧</div><h3>Lọc cho giọng nói</h3><p>Bớt nhạc nền, tự chỉnh âm lượng để nhận dạng lời thoại rõ hơn khi Dịch trực tiếp.</p></div>
              <div className="lp-feat lp-reveal"><div className="lp-ic" style={{ background: "rgba(231,182,58,.14)" }}>✨</div><h3>Trau chuốt câu chữ</h3><p>Một lượt chỉnh lại để câu tự nhiên, gọn, dễ đọc như phụ đề thật; sửa từng dòng khi cần.</p></div>
              <div className="lp-feat lp-reveal"><div className="lp-ic" style={{ background: "rgba(61,214,195,.14)" }}>🔊</div><h3>Thuyết minh</h3><p>Nghe bản dịch được đọc thành tiếng theo video. Giọng neural và giọng máy không trừ Token dịch.</p></div>
            </div>
          </div>
        </section>

        {/* ỨNG DỤNG ANDROID */}
        <section id="ung-dung" style={{ paddingTop: 0 }}>
          <div className="lp-wrap">
            <div className="lp-app lp-reveal">
              <div>
                <div className="lp-eyebrow">Ứng dụng Android</div>
                <h2>Phụ đề nổi <span className="lp-grad">ngay trên video đang phát</span></h2>
                <p className="lp-sub">
                  Bấm Bắt đầu và đồng ý chia sẻ: ứng dụng thu tiếng điện thoại đang phát, gửi đi dịch và hiện phụ đề tiếng Việt nổi trên màn hình. Chỉ thu tiếng, không chụp hay quay hình; không tải video, không lưu tiếng.
                </p>
                <div className="lp-cta-row">
                  <a className="lp-btn lp-btn-gold" href={ANDROID_APK_LATEST} rel="noopener">Tải ứng dụng (APK {ANDROID_APP.name})</a>
                  <Link to="/huong-dan" className="lp-btn lp-btn-ghost">Hướng dẫn cài đặt</Link>
                </div>
                <p className="lp-note" style={{ textAlign: "left" }}>
                  Cần Android 10 trở lên. Cài từ tệp APK nên Android có thể hỏi cho phép cài từ nguồn này. Liên kết ứng dụng bằng mã lấy ở trang Tài khoản; dùng chung tài khoản và Token dịch với web.
                </p>
              </div>
              <div className="lp-phone" role="img" aria-label="Minh họa phụ đề nổi trên điện thoại">
                <div className="lp-notch" />
                <div className="lp-scene" />
                <div className="lp-silhouette lp-s1" style={{ left: "20%", width: "55%", height: "46%" }} />
                <div className="lp-chips"><span>Video</span><span>Livestream</span><span>Ứng dụng khác</span></div>
                <div className="lp-bubble"><small>{PHONE[phone][0]}</small><span>{PHONE[phone][1]}</span></div>
              </div>
            </div>
          </div>
        </section>

        {/* GIÁ */}
        <section id="gia" style={{ paddingTop: 0 }}>
          <div className="lp-wrap">
            <div className="lp-center lp-reveal">
              <div className="lp-eyebrow">Bảng giá</div>
              <h2>Chi phí nhẹ, {cheapest ? <>chỉ từ <span className="lp-gold">{dong(cheapest.price)}</span></> : <span className="lp-gold">thuê theo ngày</span>}</h2>
              <p className="lp-sub">
                Đăng ký là dùng thử: {TRIAL_FILES} tệp, tối đa {TRIAL_MINUTES} phút, không quá {trialMb} MB, xem đủ chức năng, chưa xuất file. Thích thì thuê gói để không giới hạn số tệp trong hạn và xuất file.
              </p>
            </div>
            <div className="lp-plans">
              {plans.map((plan) => {
                const perDay = Math.round(plan.price / (plan.hours / 24));
                const hot = plan.id === "tuan";
                return (
                  <div className={hot ? "lp-plan lp-hot lp-reveal" : "lp-plan lp-reveal"} key={plan.id}>
                    {hot ? <span className="lp-ribbon">🔥 Gói gợi ý</span> : null}
                    <h3>Gói {plan.name}</h3>
                    <div className="lp-price">
                      {dong(plan.price)}
                      <small> / {plan.name}</small>
                      {plan.strike ? <span className="lp-was">{dong(plan.strike)}</span> : null}
                    </div>
                    <div className="lp-per">{PLAN_TAG[plan.id]} · khoảng {dong(perDay)} mỗi ngày</div>
                    {plan.save ? <div className="lp-save">Tiết kiệm {dong(plan.save)} so với mua lẻ gói 24 giờ</div> : null}
                    <ul>
                      <li>Không giới hạn số tệp trong hạn</li>
                      <li>Xuất file phụ đề SRT, VTT, TXT</li>
                      <li>Đầy đủ chức năng nhận dạng và dịch</li>
                    </ul>
                    <Link to="/goi" className={hot ? "lp-btn lp-btn-gold" : "lp-btn lp-btn-ghost"}>Chọn gói {plan.name}</Link>
                  </div>
                );
              })}
            </div>
            <p className="lp-note">
              Dịch trực tiếp và cửa trả theo lượt dùng Token dịch, mua riêng. Thanh toán chuyển khoản bằng mã QR. Khi bạn dùng key AI của mình, cước của nhà cung cấp AI do bạn tự trả. Hết hạn thì phần còn lại mất, không hoàn tiền.
            </p>
          </div>
        </section>

        {/* HỎI ĐÁP */}
        <section style={{ paddingTop: 0 }}>
          <div className="lp-wrap">
            <div className="lp-center lp-reveal"><div className="lp-eyebrow">Hỏi nhanh</div><h2>Bạn còn thắc mắc?</h2></div>
            <div className="lp-faq">
              <details className="lp-reveal">
                <summary>Dùng thử có mất tiền không?</summary>
                <p>Không. Tài khoản mới được dùng thử {TRIAL_FILES} tệp, tối đa {TRIAL_MINUTES} phút, không quá {trialMb} MB, xem đủ chức năng nhưng chưa xuất file phụ đề. Lượt thử chỉ bị trừ khi nhận dạng đã gọi được máy dịch.</p>
              </details>
              <details className="lp-reveal">
                <summary>Hỗ trợ những ngôn ngữ nào?</summary>
                <p>Làm phụ đề từ tệp: nguồn tiếng Trung, Hàn, Nhật, Anh, dịch sang tiếng Việt. Dịch trực tiếp: hỗ trợ hàng chục ngôn ngữ nói và ngôn ngữ dịch, chọn ngay trong màn hình Dịch trực tiếp.</p>
              </details>
              <details className="lp-reveal">
                <summary>Có cần máy tính mạnh không?</summary>
                <p>Không. Phần nhận dạng và dịch chạy ở dịch vụ AI, nên điện thoại hay máy tính phổ thông có trình duyệt hiện đại và kết nối mạng ổn định là dùng được.</p>
              </details>
              <details className="lp-reveal">
                <summary>Dữ liệu của tôi đi đâu?</summary>
                <p>
                  TyZo Sub không lưu video; video được xử lý trên máy bạn. Phần tiếng hoặc chữ cần thiết được gửi tới nhà cung cấp AI đang dùng để nhận dạng và dịch (có thể ở nước ngoài). Chi tiết ở mục 5 của{" "}
                  <Link to="/dieu-khoan">Điều khoản và Chính sách</Link>.
                </p>
              </details>
              <details className="lp-reveal">
                <summary>Dịch trực tiếp dùng ở đâu?</summary>
                <p>Trên web: âm thanh một tab của trình duyệt (máy tính) hoặc micro; điện thoại và máy tính bảng thường dùng micro. Trên ứng dụng Android: tiếng điện thoại đang phát từ ứng dụng khác.</p>
              </details>
              <details className="lp-reveal">
                <summary>Dịch có chính xác không?</summary>
                <p>AI nhận dạng và dịch theo ngữ cảnh, kết hợp thuật ngữ và văn phong theo thể loại. TyZo Sub không cam kết đúng hết câu, đúng ý, đúng giọng, nhất là khi nhiều nhạc nền hoặc nói chồng nhau. Bạn nên xem lại và sửa trước khi đăng hoặc phát.</p>
              </details>
              <details className="lp-reveal">
                <summary>Tôi cần có quyền gì với nội dung đưa vào?</summary>
                <p>
                  Bạn cần sở hữu nội dung, hoặc được chủ sở hữu cho phép nhận dạng, dịch, làm phụ đề, hoặc pháp luật cho phép; mỗi tệp đều hỏi bạn xác nhận. Không dùng công cụ để làm phụ đề cho tác phẩm của người khác rồi đăng, phát, bán khi chưa được phép. Xem mục 2 và 3 của{" "}
                  <Link to="/dieu-khoan">Điều khoản và Chính sách</Link>.
                </p>
              </details>
            </div>
          </div>
        </section>

        {/* CHỐT */}
        <section style={{ paddingTop: 0 }}>
          <div className="lp-wrap">
            <div className="lp-final lp-reveal">
              <div className="lp-eyebrow">Bắt đầu ngay</div>
              <h2>Có video trong tay?<br /><span className="lp-grad">Vietsub nằm trong tầm với.</span></h2>
              <p className="lp-sub" style={{ margin: "0 auto 30px" }}>Đăng ký là dùng thử miễn phí {TRIAL_FILES} tệp. Không cần thẻ.</p>
              <Link to="/login" className="lp-btn lp-btn-gold lp-pulse">
                Dùng thử miễn phí ngay
                {ARROW}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="lp-wrap">
          <div className="lp-links">
            <Link to="/dieu-khoan">Điều khoản và Chính sách</Link>
            <Link to="/huong-dan">Hướng dẫn</Link>
            <Link to="/goi">Bảng giá</Link>
            <Link to="/login">Đăng nhập</Link>
          </div>
          <p className="lp-fine">
            TyZo Sub là dịch vụ phần mềm (SaaS) cung cấp công cụ AI theo yêu cầu của người dùng; không cung cấp, phát hành hay lưu trữ nội dung. Người dùng chịu trách nhiệm về quyền đối với video và âm thanh đưa vào, và xem lại bản dịch trước khi đăng hoặc phát. Kết quả do AI tạo ra, không cam kết đúng hết câu, đúng ý, đúng giọng.
          </p>
          <p className="lp-fine" style={{ marginTop: 10 }}>© 2026 TyZo Sub · Công cụ phụ đề video bằng AI</p>
        </div>
      </footer>

      <div className="lp-sticky">
        <Link to="/login" className="lp-btn lp-btn-gold">Dùng thử miễn phí ⚡</Link>
      </div>
    </div>
  );
}
