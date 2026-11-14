/**
 * Nội dung trang Hướng dẫn. Hàm thuần, không import gì từ máy chủ, chạy được trong test Node.
 *
 * Để hướng dẫn không lệch khi app đổi:
 *  - Giá, thời hạn gói, hạn mức dùng thử và thời gian giữ đơn nạp lấy thẳng từ hằng số của app, không chép số vào chữ.
 *  - Tên nút, tên mục menu nhắc trong chữ chỉ lấy từ bảng `UI` dưới đây. `guide-topics.test.ts` kiểm từng tên còn
 *    xuất hiện trong giao diện. Ai đổi tên một nút thì test báo lỗi tại đây, sửa một chỗ là xong.
 *  - Mục «Đổi mật khẩu và quên mật khẩu» đổi theo việc phòng có bật thư đặt lại mật khẩu hay không.
 *  - Ảnh minh họa (nếu có) đặt ở `public/huong-dan/<tên>.png` rồi điền tên vào `image`. Thiếu ảnh thì trang tự bỏ khung ảnh.
 */
import { foldText } from "./admin-tabs.ts";
import { PAY_MINUTES } from "./pay-minutes.ts";
import { ROOM_PLANS, TRIAL_BYTES, TRIAL_FILES, TRIAL_MINUTES } from "./room-plans.ts";
import type { TourId } from "./tour-steps.ts";

/** Tên hiện trên giao diện mà hướng dẫn nhắc tới. Đổi tên nút ở app thì đổi ở đây. */
export const UI = {
  keyTab: "Key Sub",
  filmTab: "Phim",
  voiceTab: "Nghe",
  advanced: "Nâng cao",
  glossary: "Thuật ngữ",
  startRun: "Tải và dịch",
  download: "Tải phụ đề",
  account: "Tài khoản",
  wallet: "Số dư và nạp tiền",
  live: "Dịch trực tiếp",
  getVideo: "Tải video",
  tabAudio: "Âm thanh tab",
  mic: "Micro",
  begin: "Bắt đầu",
  changePassword: "Đổi mật khẩu",
  forgot: "Quên mật khẩu",
  appeal: "Yêu cầu xem lại",
  autoLang: "Tự nhận biết",
} as const;

export type GuideStep = {
  text: string;
  /** Tên tệp ảnh trong `public/huong-dan/`, ví dụ "groq-tao-key.png". Thiếu tệp thì không hiện. */
  image?: string;
  /** Liên kết ra ngoài (mở tab mới). */
  link?: { label: string; href: string };
};

export type GuideTopic = {
  id: string;
  title: string;
  group: "dung-ngay" | "tinh-nang" | "tai-khoan" | "tro-giup";
  intro: string;
  steps: GuideStep[];
  /** Từ khóa phụ để tìm (không dấu cũng được). */
  words: string;
  /** Có tuyến «Chỉ tôi» chạy trên giao diện thật. */
  tour?: TourId;
  /** Trang trong app liên quan tới mục này. */
  page?: { label: string; to: "/" | "/dich-truc-tiep" | "/goi" | "/yeu-cau" };
  /** Mục này hiện thêm thẻ thông tin liên hệ do Chủ nhập. */
  contact?: boolean;
};

export type GuideFaq = { id: string; q: string; a: string; words: string };

export const GROUP_LABEL: Record<GuideTopic["group"], string> = {
  "dung-ngay": "Dùng ngay",
  "tinh-nang": "Tính năng",
  "tai-khoan": "Tài khoản và tiền",
  "tro-giup": "Trợ giúp",
};

export type GuideContext = {
  /** Phòng có bật thư đặt lại mật khẩu. `null` khi chưa biết. */
  resetOn?: boolean | null;
};

function dong(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
}

function megabytes(bytes: number): number {
  return Math.round(bytes / (1024 * 1024));
}

function planLines(): string {
  return ROOM_PLANS.map((plan) => `${plan.name} ${dong(plan.price)}`).join(", ");
}

function planSaving(): string {
  const cheaper = ROOM_PLANS.filter((plan) => plan.save != null);
  return cheaper.map((plan) => `gói ${plan.name} rẻ hơn mua lẻ ${dong(plan.save!)}`).join(", ");
}

function passwordForgotSteps(resetOn: boolean | null | undefined): GuideStep[] {
  if (resetOn === true) {
    return [
      { text: `Ở màn đăng nhập, bấm «${UI.forgot}» rồi nhập email đã đăng ký.` },
      { text: "Mở thư phòng gửi tới, bấm liên kết trong thư và đặt mật khẩu mới. Liên kết có hạn. Không thấy thư thì xem cả mục thư rác." },
      { text: "Quay lại màn đăng nhập và vào bằng mật khẩu mới." },
    ];
  }
  if (resetOn === false) {
    return [
      { text: "Phòng chưa gửi thư đặt lại mật khẩu, nên màn đăng nhập chưa có cách tự đặt lại." },
      { text: "Hãy liên hệ hỗ trợ ở mục «Hỗ trợ và liên hệ» của trang này và nói rõ email đã đăng ký. Phòng có thể đặt mật khẩu tạm cho bạn, sau đó bạn tự đổi lại." },
    ];
  }
  return [
    { text: `Nếu màn đăng nhập có nút «${UI.forgot}»: bấm vào, nhập email đã đăng ký, mở thư và bấm liên kết để đặt mật khẩu mới.` },
    { text: "Nếu màn đăng nhập không có nút đó thì phòng chưa gửi thư. Hãy liên hệ hỗ trợ ở mục «Hỗ trợ và liên hệ» của trang này, phòng có thể đặt mật khẩu tạm cho bạn." },
  ];
}

export function guideTopics(context: GuideContext = {}): GuideTopic[] {
  return [
    {
      id: "bat-dau-nhanh",
      title: "Bắt đầu nhanh",
      group: "dung-ngay",
      intro: "Từ video đến file phụ đề tiếng Việt trong năm bước.",
      words: "bat dau dung thu dang ky dang nhap chon video keo tha link dich tai phu de srt vtt txt",
      tour: "quick-start",
      page: { label: "Về trang chủ", to: "/" },
      steps: [
        { text: `Đăng ký hoặc đăng nhập. Tài khoản mới được dùng thử: ${TRIAL_FILES} tệp, tối đa ${TRIAL_MINUTES} phút, không quá ${megabytes(TRIAL_BYTES)} MB.` },
        { text: "Ở trang chủ, kéo thả video vào ô lớn hoặc bấm để chọn tệp. Cũng dán được link tải thẳng về tệp, không phải link trang xem phim." },
        { text: `Mở «${UI.keyTab}» ở menu trái và chọn cách dùng: dán key Groq của bạn, hoặc trả theo lượt bằng số dư trong ví.` },
        { text: `Mở «${UI.filmTab}», chọn ngôn ngữ và thể loại, rồi bấm «${UI.startRun}». Thanh tiến trình cho biết đang ở bước nào.` },
        { text: `Dịch xong, bấm «${UI.download}» và chọn SRT, VTT hoặc TXT. Bấm một câu trong bản dịch để nhảy tới đúng chỗ trong video. Tài khoản dùng thử chưa xuất được file.` },
      ],
    },
    {
      id: "phu-de",
      title: "Phụ đề: xem, sửa và chỉnh kiểu",
      group: "tinh-nang",
      intro: "Phụ đề hiện đồng bộ trên khung phát và sửa được ngay tại dòng.",
      words: "phu de sua cau font co chu mau nen vi tri hien thi",
      tour: "phu-de",
      steps: [
        { text: "Bản dịch chạy cùng video. Bấm một câu trong danh sách để video nhảy tới đúng chỗ đó." },
        { text: "Thấy câu dịch chưa ổn thì sửa ngay tại dòng, không cần dịch lại cả phim." },
        { text: "Trong bảng cài đặt phụ đề có phông, cỡ chữ, màu, nền và vị trí. Khung mẫu ở đầu bảng cho thấy kết quả ngay khi chỉnh." },
      ],
    },
    {
      id: "thuyet-minh",
      title: "Thuyết minh (đọc bản dịch thành tiếng)",
      group: "tinh-nang",
      intro: "Nghe bản dịch được đọc theo video.",
      words: "thuyet minh doc giong nghe tts neural orpheus am thanh",
      tour: "thuyet-minh",
      steps: [
        { text: `Mở «${UI.voiceTab}» ở menu trái để bật hoặc tắt thuyết minh và chọn giọng. Bạn tắt thì lần sau app giữ tắt.` },
        { text: "Giọng neural cần mạng. Khi mạng lỗi, app đọc bằng giọng có sẵn trên máy." },
        { text: "Giọng Orpheus dùng key Groq của bạn." },
      ],
    },
    {
      id: "dich-truc-tiep",
      title: "Dịch trực tiếp",
      group: "tinh-nang",
      intro: "Nghe tiếng nói và hiện chữ gốc cùng chữ dịch ngay khi đang nói.",
      words: "dich truc tiep live micro tab giong noi thoi gian thuc hop phat truc tiep",
      tour: "dich-truc-tiep",
      page: { label: "Mở Dịch trực tiếp", to: "/dich-truc-tiep" },
      steps: [
        { text: `Mở «${UI.live}» ở menu trái. Chọn nguồn: «${UI.tabAudio}» (tiếng từ một tab trình duyệt) hoặc «${UI.mic}».` },
        { text: `Chọn ngôn ngữ nói (để «${UI.autoLang}» nếu chưa rõ) và ngôn ngữ dịch. Bật tiếng dịch nếu muốn nghe.` },
        { text: `Bấm «${UI.begin}». Với «${UI.tabAudio}», trình duyệt hiện hộp chọn: hãy chọn đúng tab đang phát và bật mục chia sẻ âm thanh của tab.`, image: "chia-se-tab.png" },
        { text: "Điện thoại và máy tính bảng thường không thu được tiếng của tab. Máy đó app tự chuyển sang micro." },
        { text: "Số dư và số phút còn lại hiện ngay trên màn hình, kèm cảnh báo khi sắp hết tiền. Có chữ rồi thì tải được SRT, VTT hoặc TXT của buổi vừa dịch." },
      ],
    },
    {
      id: "thuat-ngu",
      title: "Thuật ngữ theo thể loại phim",
      group: "tinh-nang",
      intro: "Giúp dịch đúng từ chuyên dụng của từng thể loại.",
      words: "thuat ngu glossary the loai phim tu dien dich dung tu",
      tour: "thuat-ngu",
      steps: [
        { text: `Mở nhóm «${UI.advanced}» ở menu trái, chọn «${UI.glossary}».` },
        { text: "Chọn thể loại của phim. Bộ thuật ngữ có cho tiếng Nhật, Hàn, Trung và Anh." },
        { text: "Chọn «Tự động» thì app không nạp bộ thuật ngữ có sẵn. Thuật ngữ bạn tự thêm lưu trên máy này." },
      ],
    },
    {
      id: "nap-tien-goi",
      title: "Nạp tiền và gói",
      group: "tai-khoan",
      intro: "Có hai cách trả: thuê phòng theo gói, hoặc trả theo lượt bằng số dư trong ví.",
      words: "nap tien goi gia thue phong tra theo luot vi so du chuyen khoan dung thu 24 gio 7 ngay 30 ngay",
      tour: "nap-tien",
      page: { label: "Xem bảng giá", to: "/goi" },
      steps: [
        { text: `Nạp tiền: mở «${UI.account}» ở menu trái, chọn «${UI.wallet}», chọn mức nạp hoặc nhập số tiền, rồi chuyển khoản đúng số tiền và nội dung chuyển khoản hiện ra. Đơn nạp còn hiệu lực ${PAY_MINUTES} phút kể từ lúc tạo.` },
        { text: `Gói thuê phòng: ${planLines()}. Trong hạn không giới hạn số tệp và được xuất file Vietsub; ${planSaving()}.` },
        { text: `Dùng thử: ${TRIAL_FILES} tệp, tối đa ${TRIAL_MINUTES} phút, không quá ${megabytes(TRIAL_BYTES)} MB, không xuất file Vietsub.` },
        { text: "Trả theo lượt: phòng giữ một khoản ước tính trong ví, khi xong trừ số tiền thực dùng và trả lại phần thừa. Nếu nhà cung cấp báo lỗi thì không bị tính tiền. Tài khoản dùng thử chưa dùng được cách này." },
        { text: "Nếu bạn dùng key Groq của mình thì Groq tính tiền nhận dạng và dịch cho bạn, phòng không trừ ví cho lượt chạy đó." },
      ],
    },
    {
      id: "key-groq",
      title: "Lấy key Groq",
      group: "tai-khoan",
      intro: "Key Groq là chìa khóa để dùng dịch vụ của Groq bằng tài khoản của bạn.",
      words: "key groq api gsk console tao key lay key dan key khoa",
      tour: "key-groq",
      steps: [
        { text: "Mở trang quản lý key của Groq và đăng nhập (hoặc đăng ký) bằng tài khoản Groq.", link: { label: "console.groq.com/keys", href: "https://console.groq.com/keys" }, image: "groq-tao-key.png" },
        { text: "Chọn tạo key mới (Create API Key) và đặt tên tùy ý để bạn nhớ." },
        { text: "Sao chép key ngay khi tạo xong, vì thường không xem lại được sau đó. Key bắt đầu bằng gsk_." },
        { text: `Quay lại app, mở «${UI.keyTab}» và dán key vào ô key. Key chỉ lưu trên máy này. Dán xong app tự kiểm tra key và model.` },
        { text: "Không gửi key cho ai, kể cả khi hỏi hỗ trợ." },
      ],
    },
    {
      id: "mat-khau",
      title: "Đổi mật khẩu và quên mật khẩu",
      group: "tai-khoan",
      intro: "Đổi khi còn nhớ mật khẩu cũ. Quên thì đặt lại qua thư hoặc nhờ hỗ trợ.",
      words: "mat khau doi quen dat lai email dang nhap khong vao duoc",
      tour: "mat-khau",
      steps: [
        { text: `Đổi mật khẩu: mở «${UI.account}» ở menu trái, chọn «${UI.wallet}», kéo tới «${UI.changePassword}». Nhập mật khẩu hiện tại và mật khẩu mới (ít nhất 8 ký tự).` },
        { text: "Đổi xong, các máy khác đang đăng nhập tài khoản này sẽ bị đăng xuất." },
        ...passwordForgotSteps(context.resetOn),
      ],
    },
    {
      id: "ho-tro",
      title: "Hỗ trợ và liên hệ",
      group: "tro-giup",
      intro: "Cần hỏi về gói, nạp tiền, khóa hoặc cấm tài khoản.",
      words: "ho tro lien he zalo facebook email hoi yeu cau xem lai khieu nai",
      tour: "ho-tro",
      contact: true,
      page: { label: `Mở «${UI.appeal}»`, to: "/yeu-cau" },
      steps: [
        { text: `Việc cần người xem lại (gói, nạp tiền, khóa, cấm): gửi ở «${UI.appeal}». Mô tả rõ việc và thời điểm xảy ra.` },
        { text: "Không gửi key Groq hay mật khẩu trong yêu cầu." },
      ],
    },
  ];
}

export const GUIDE_FAQ: GuideFaq[] = [
  {
    id: "khong-xuat-duoc",
    q: "Vì sao tôi không tải được file phụ đề?",
    a: "Tài khoản dùng thử và tài khoản hết hạn gói không xuất được file Vietsub. Mua gói thuê phòng để xuất file. Phụ đề trên màn hình vẫn xem được bình thường.",
    words: "xuat file srt vtt khong tai duoc dung thu het han",
  },
  {
    id: "tep-bi-tu-choi",
    q: "Tệp của tôi bị từ chối vì quá dài hoặc quá nặng?",
    a: `Bản dùng thử nhận tệp tối đa ${TRIAL_MINUTES} phút và ${megabytes(TRIAL_BYTES)} MB. Cắt ngắn tệp hoặc mua gói thuê phòng.`,
    words: "tep dai nang dung thu gioi han phut mb tu choi",
  },
  {
    id: "dan-link-khong-chay",
    q: "Tôi dán link mà app không chạy?",
    a: `App cần link tải thẳng về tệp video hoặc âm thanh (đuôi như .mp4, .mkv) và link phải công khai. Link trang xem phim thì không dùng được: hãy chọn tệp từ máy, hoặc thử «${UI.getVideo}» ở menu trái để tìm link tệp trên một trang web.`,
    words: "dan link khong chay url youtube trang xem tai tep",
  },
  {
    id: "key-groq-loi",
    q: "App báo key Groq không hợp lệ?",
    a: "Key không hợp lệ hoặc chưa được cấp quyền. Kiểm tra lại key ở console.groq.com/keys. Không được thì tạo key mới rồi dán lại.",
    words: "key groq khong hop le sai loi bao loi het han",
  },
  {
    id: "xoa-du-lieu",
    q: "Xóa dữ liệu trình duyệt thì mất gì?",
    a: "Key Groq, tên phim, ghi chú, thuật ngữ bạn thêm và giọng đã khóa lưu trên máy bạn nên sẽ mất. Tài khoản, số dư và gói của bạn nằm ở phòng nên không mất.",
    words: "xoa du lieu trinh duyet cache mat key luu tren may",
  },
  {
    id: "live-khong-co-tieng",
    q: "Dịch trực tiếp không nghe được tiếng của tab?",
    a: `Khi bấm «${UI.begin}», hộp chọn của trình duyệt phải chọn đúng tab và bật mục chia sẻ âm thanh của tab. Quên bật mục đó thì app không nhận được tiếng. Máy không thu được tab thì dùng «${UI.mic}».`,
    words: "dich truc tiep khong co tieng tab chia se am thanh micro live",
  },
];

export type GuideMatch = { topics: GuideTopic[]; faqs: GuideFaq[] };

function topicText(topic: GuideTopic): string {
  return [topic.title, topic.intro, topic.words, ...topic.steps.map((step) => step.text)].join(" ");
}

/** Lọc mục theo chữ gõ. Mọi từ phải có mặt; không dấu cũng tìm được. Không gõ gì thì trả hết. */
export function matchGuide(query: string, topics: GuideTopic[], faqs: GuideFaq[] = GUIDE_FAQ): GuideMatch {
  const words = foldText(query).split(/\s+/).filter(Boolean);
  if (!words.length) return { topics, faqs };
  const has = (haystack: string) => {
    const folded = foldText(haystack);
    return words.every((word) => folded.includes(word));
  };
  return {
    topics: topics.filter((topic) => has(topicText(topic))),
    faqs: faqs.filter((faq) => has(`${faq.q} ${faq.a} ${faq.words}`)),
  };
}
