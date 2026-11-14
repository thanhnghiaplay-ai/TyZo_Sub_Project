import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { AppShell, RailToggle, SideRail, type RailItem } from "@/components/side-rail";
import { BrandMark } from "@/components/brand-mark";
import { DisplayToggle } from "@/components/display-toggle";
import { NoticeBell } from "@/components/notice-bell";
import { VersionMark } from "@/components/version-mark";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { GROUP_LABEL, GUIDE_FAQ, guideTopics, matchGuide, type GuideStep, type GuideTopic } from "@/lib/guide-topics";
import { getMailFace } from "@/lib/mail-runtime";
import { contactLinks, EMPTY_CONTACT, type SupportContact } from "@/lib/support-contact";
import { getSupportContact } from "@/lib/support-room";
import { requestTour } from "@/lib/tour-request";

const RAIL: RailItem[] = [
  { id: "home", label: "Trang chủ", href: "/" },
  { id: "huong-dan", label: "Hướng dẫn", current: true },
  { id: "dich-truc-tiep", label: "Dịch trực tiếp", href: "/dich-truc-tiep" },
  { id: "tai-video", label: "Tải video", href: "/tai-video" },
  {
    id: "tai-khoan",
    label: "Tài khoản",
    children: [
      { id: "goi", label: "Thuê phòng và gói", href: "/goi" },
      { id: "ctv", label: "Cộng tác viên", href: "/ctv" },
      { id: "yeu-cau", label: "Yêu cầu xem lại", href: "/yeu-cau" },
    ],
  },
];

/** Ảnh minh họa tùy chọn. Chưa có tệp thì bỏ cả khung, khách không thấy ô ảnh vỡ. */
function StepImage({ name }: { name: string }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return <img src={`/huong-dan/${name}`} alt="" loading="lazy" onError={() => setOk(false)} className="mt-2 max-h-72 max-w-full rounded-xl border border-line" />;
}

function Step({ step }: { step: GuideStep }) {
  return (
    <li className="pl-1">
      <span>{step.text}</span>
      {step.link && (
        <>
          {" "}
          <a href={step.link.href} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent underline">
            {step.link.label}
          </a>
        </>
      )}
      {step.image && <StepImage name={step.image} />}
    </li>
  );
}

function ContactCard({ contact }: { contact: SupportContact | null }) {
  if (contact === null) return <p className="text-sm text-muted">Đang đọc thông tin liên hệ…</p>;
  const links = contactLinks(contact);
  if (!links.length) {
    return <p className="rounded-xl border border-line bg-raised px-3 py-2 text-sm text-muted">Phòng chưa đăng cách liên hệ riêng. Hãy gửi yêu cầu ở «Yêu cầu xem lại», phòng sẽ trả lời ở đó.</p>;
  }
  return (
    <div className="grid gap-2 rounded-xl border border-line bg-raised p-3">
      <ul className="flex flex-wrap gap-2">
        {links.map((link) => (
          <li key={link.kind}>
            <a href={link.href} target={link.kind === "email" ? undefined : "_blank"} rel="noopener noreferrer" className="inline-flex min-tap items-center gap-2 rounded-full border border-line bg-card px-4 text-sm">
              <span className="text-muted">{link.label}</span>
              <span className="font-semibold break-all">{link.value}</span>
            </a>
          </li>
        ))}
      </ul>
      {contact.note && <p className="text-sm text-muted">{contact.note}</p>}
    </div>
  );
}

function Topic({ topic, contact, onTour }: { topic: GuideTopic; contact: SupportContact | null; onTour: (topic: GuideTopic) => void }) {
  return (
    <section id={topic.id} aria-labelledby={`${topic.id}-title`} className="scroll-mt-4 rounded-2xl border border-line bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-accent">{GROUP_LABEL[topic.group]}</p>
          <h2 id={`${topic.id}-title`} className="text-base font-semibold">
            {topic.title}
          </h2>
        </div>
        {topic.tour && (
          <button type="button" className="min-tap shrink-0 rounded-full bg-accent px-4 text-sm font-semibold text-ink" onClick={() => onTour(topic)}>
            Chỉ tôi
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">{topic.intro}</p>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
        {topic.steps.map((step, index) => (
          <Step key={index} step={step} />
        ))}
      </ol>
      {topic.contact && (
        <div className="mt-3">
          <ContactCard contact={contact} />
        </div>
      )}
      {topic.page && (
        <Link to={topic.page.to} className="mt-3 inline-flex min-tap items-center rounded-full border border-line px-4 text-sm">
          {topic.page.label}
        </Link>
      )}
    </section>
  );
}

/** Trang Hướng dẫn: mục lục, ô tìm kiếm, từng mục có «Chỉ tôi» khi đã có tuyến chạy trên giao diện thật, câu hỏi thường gặp và cách liên hệ. */
export function GuidePage() {
  const { user } = useCurrentUserState();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [resetOn, setResetOn] = useState<boolean | null>(null);
  const [contact, setContact] = useState<SupportContact | null>(null);

  useEffect(() => {
    void getMailFace()
      .then((face) => setResetOn(face.resetOn))
      .catch(() => setResetOn(null));
    void getSupportContact()
      .then(setContact)
      .catch(() => setContact({ ...EMPTY_CONTACT }));
  }, []);

  const topics = useMemo(() => guideTopics({ resetOn }), [resetOn]);
  const found = useMemo(() => matchGuide(query, topics, GUIDE_FAQ), [query, topics]);
  const searching = query.trim().length > 0;
  const nothing = found.topics.length === 0 && found.faqs.length === 0;

  // Mở bằng liên kết có #mục (từ Ctrl+K hoặc mục lục): cuộn tới đúng mục sau khi vẽ xong.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    if (!id) return;
    const timer = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: "start" }), 80);
    return () => window.clearTimeout(timer);
  }, []);

  function startTour(topic: GuideTopic) {
    if (!topic.tour) return;
    requestTour(topic.tour);
    void navigate({ to: "/" });
  }

  return (
    <AppShell className="contents">
      <SideRail label="Chức năng" items={RAIL} who={{ name: user?.displayName, email: user?.primaryEmail }} />
      <main className="room-wide mx-auto flex min-h-dvh flex-col gap-3 bg-bg px-4 py-4 text-fg">
        <header className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <RailToggle />
            <BrandMark small title="TyZo Sub" />
          </div>
          <div className="flex items-center gap-2">
            <VersionMark />
            <DisplayToggle />
            <NoticeBell />
          </div>
        </header>

        <div>
          <h1 className="text-xl font-semibold">Hướng dẫn</h1>
          <p className="mt-1 text-sm text-muted">Cách dùng từng việc, nạp tiền, lấy key và liên hệ hỗ trợ. Gõ từ khóa để tìm nhanh.</p>
        </div>

        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm: nạp tiền, key Groq, quên mật khẩu…"
          aria-label="Tìm trong hướng dẫn"
          autoComplete="off"
          className="min-h-12 w-full rounded-2xl border border-line bg-raised px-4 text-base outline-none"
        />

        {!searching && (
          <nav aria-label="Mục lục" className="flex flex-wrap gap-2">
            {topics.map((topic) => (
              <a key={topic.id} href={`#${topic.id}`} className="inline-flex min-tap items-center rounded-full border border-line px-3 text-sm">
                {topic.title.split(":")[0].split(" (")[0]}
              </a>
            ))}
            <a href="#cau-hoi" className="inline-flex min-tap items-center rounded-full border border-line px-3 text-sm">
              Câu hỏi thường gặp
            </a>
          </nav>
        )}

        {searching && (
          <p className="text-sm text-muted" role="status">
            {nothing ? "Không có mục nào khớp." : `Khớp ${found.topics.length} mục hướng dẫn và ${found.faqs.length} câu hỏi.`}
          </p>
        )}

        {nothing && searching && (
          <p className="rounded-2xl border border-line bg-card p-4 text-sm">
            Thử từ khóa khác, hoặc{" "}
            <button type="button" className="font-semibold text-accent underline" onClick={() => setQuery("liên hệ")}>
              xem cách liên hệ hỗ trợ
            </button>
            .
          </p>
        )}

        {found.topics.map((topic) => (
          <Topic key={topic.id} topic={topic} contact={contact} onTour={startTour} />
        ))}

        {found.faqs.length > 0 && (
          <section id="cau-hoi" aria-labelledby="cau-hoi-title" className="scroll-mt-4 rounded-2xl border border-line bg-card p-4">
            <h2 id="cau-hoi-title" className="text-base font-semibold">
              Câu hỏi thường gặp
            </h2>
            <div className="mt-2 grid gap-2">
              {found.faqs.map((faq) => (
                <details key={`${faq.id}-${searching}`} open={searching} className="rounded-xl border border-line bg-raised px-3 py-2">
                  <summary className="min-tap flex cursor-pointer items-center text-sm font-semibold">{faq.q}</summary>
                  <p className="pb-1 text-sm text-muted">{faq.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}
      </main>
    </AppShell>
  );
}
