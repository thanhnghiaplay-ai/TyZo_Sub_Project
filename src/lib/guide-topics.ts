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
import { MENU_GROUP, MENU_ITEM, TOOL_NAME } from "./customer-menu.ts";
import { dong } from "./money-format.ts";
import { PROVIDER_IDS, PROVIDERS, providerDoes, providersWith } from "./sub/provider.ts";
import { PAY_MINUTES } from "./pay-minutes.ts";
import { plansWith, type PricedPlan } from "./room-plan-prices.ts";
import { TRIAL_BYTES, TRIAL_FILES, TRIAL_MINUTES } from "./room-plans.ts";
import type { TourId } from "./tour-steps.ts";

/** Tên hiện trên giao diện mà hướng dẫn nhắc tới. Đổi tên nút ở app thì đổi ở đây. */
export const UI = {
  keyTab: TOOL_NAME.key,
  filmTab: TOOL_NAME.phim,
  voiceTab: TOOL_NAME.voice,
  advanced: MENU_GROUP.normal,
  glossary: TOOL_NAME.thuatngu,
  startRun: "Tải và dịch",
  download: "Tải phụ đề",
  account: MENU_GROUP.wallet,
  wallet: MENU_ITEM.tokens,
  live: "Dịch trực tiếp",
  tabAudio: "Âm thanh tab",
  mic: "Micro",
  begin: "Bắt đầu",
  changePassword: "Đổi mật khẩu",
  forgot: "Quên mật khẩu",
  appeal: MENU_ITEM.appeal,
  autoLang: "Tự nhận biết",
  androidApp: "Ứng dụng Android",
  appLinkCode: "Lấy mã liên kết",
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
  page?: { label: string; to: "/" | "/dich-truc-tiep" | "/goi" | "/yeu-cau" | "/tai-khoan" };
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
  /** Giá gói thuê phòng Admin đang đặt. Thiếu thì dùng giá mặc định. */
  plans?: PricedPlan[];
};

function megabytes(bytes: number): number {
  return Math.round(bytes / (1024 * 1024));
}

function planLines(plans: PricedPlan[]): string {
  return plans.map((plan) => `${plan.name} ${dong(plan.price)}`).join(", ");
}

function planSaving(plans: PricedPlan[]): string {
  const cheaper = plans.filter((plan) => plan.save != null);
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
  const plans = context.plans ?? plansWith(null);
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
        { text: "Ở trang chủ, kéo thả video vào ô lớn hoặc bấm để chọn tệp. Cũng dán được link tải thẳng về tệp, không phải link trang xem video." },
        { text: `Ở dòng cách trả trên trang chủ, chọn dùng key AI của bạn hoặc trả theo lượt bằng Token dịch. Dùng key thì mở «${UI.keyTab}», bấm «Thêm key», chọn nhà (${PROVIDER_IDS.map((id) => PROVIDERS[id].label).join(", ")}) và dán key.` },
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
        { text: "Thấy câu dịch chưa ổn thì sửa ngay tại dòng, không cần dịch lại cả video." },
        { text: "Trong bảng cài đặt phụ đề có phông, cỡ chữ, màu, nền và vị trí. Khung mẫu ở đầu bảng cho thấy kết quả ngay khi chỉnh." },
      ],
    },
    {
      id: "thuyet-minh",
      title: "Thuyết minh (đọc bản dịch thành tiếng)",
      group: "tinh-nang",
      intro: "Nghe bản dịch được đọc theo video. Neural miễn phí. Orpheus, Aura và ElevenLabs khi dùng key của phòng thì trừ Token dịch.",
      words: "thuyet minh doc giong nghe tts neural orpheus aura deepgram elevenlabs tieng viet am thanh",
      tour: "thuyet-minh",
      steps: [
        { text: `Mở «${UI.voiceTab}» ở menu trái để bật hoặc tắt thuyết minh và chọn giọng. Bạn tắt thì lần sau app giữ tắt.` },
        { text: "Giọng neural cần mạng. Khi mạng lỗi, app đọc bằng giọng có sẵn trên máy." },
        { text: "Khi dùng key của phòng, Orpheus trừ Token dịch. Giọng Aura (Deepgram) luôn trừ Token dịch và chỉ đọc tiếng Anh và Tây Ban Nha. Giọng ElevenLabs đọc được tiếng Việt và nhiều tiếng khác (chưa có tiếng Thái): trả theo lượt thì trừ Token dịch, thuê phòng thì dùng key ElevenLabs của bạn. Neural và giọng máy không trừ. Giọng Orpheus khi bạn dùng key của mình thì tính vào key đó." },
      ],
    },
    {
      id: "dich-truc-tiep",
      title: "Dịch trực tiếp",
      group: "tinh-nang",
      intro: "Nghe tiếng nói và hiện chữ gốc cùng chữ dịch ngay khi đang nói.",
      words: "dich truc tiep live micro tab giong noi thoi gian thuc hop phat truc tiep phu de noi pip chu lon toan man hinh tu can giu dung ten nhan vat bilibili youtube",
      tour: "dich-truc-tiep",
      page: { label: "Mở Dịch trực tiếp", to: "/dich-truc-tiep" },
      steps: [
        { text: `Mở «${UI.live}» ở menu trái. Chọn nguồn: «${UI.tabAudio}» (tiếng từ một tab trình duyệt) hoặc «${UI.mic}».` },
        { text: `Chọn ngôn ngữ nói (để «${UI.autoLang}» nếu chưa rõ) và ngôn ngữ dịch. Bật tiếng dịch nếu muốn nghe.` },
        { text: `Bấm «${UI.begin}». Với «${UI.tabAudio}», trình duyệt hiện hộp chọn: hãy chọn đúng tab đang phát và bật mục chia sẻ âm thanh của tab.`, image: "chia-se-tab.png" },
        { text: "Điện thoại và máy tính bảng thường không thu được tiếng của tab. Máy đó app tự chuyển sang micro." },
        { text: "Số giây còn lại và số phút hiện ngay trên màn hình, kèm cảnh báo khi sắp hết. Hết giây thì phiên dừng. Có chữ rồi thì tải được SRT, VTT hoặc TXT của buổi vừa dịch." },
        { text: "Dịch trực tiếp trừ cùng Token dịch đã mua. Phiên không giữ số dư đồng." },
        { text: "Chữ dịch thường ra sau câu nói 2 đến 3 giây vì model chờ hết ý mới dịch. Chữ mờ là bản tạm, hiện sớm và có thể đổi. Muốn ra sớm hơn: chọn sẵn đúng tiếng nói thay vì «Tự nhận biết», và thử Qwen 3.5 (chốt câu sau nửa giây im lặng)." },
        { text: "Xem phim ở tab khác: bấm «Phụ đề nổi». Trên Chrome, Edge máy tính, khung phụ đề luôn nằm trên cùng, kể cả khi video toàn màn hình; kéo khung tới chỗ muốn đặt. Trình duyệt khác mở cửa sổ phụ đề riêng." },
        { text: "Dùng điện thoại cạnh TV hay loa: bấm «Chữ lớn toàn màn hình», có nút Bắt đầu, Dừng ngay trong màn đó. Cỡ chữ, số dòng, chữ gốc, nền đậm chỉnh ở «Tùy chỉnh chữ»." },
        { text: "Tên nhân vật hay bị dịch lệch: ghi vào «Từ cần giữ đúng», mỗi dòng «gốc = cách dịch». Áp dụng khi bấm Bắt đầu." },
        { text: "Tải lại trang không mất chữ: phiên gần nhất được lưu trên máy, vẫn tải được SRT, VTT, TXT." },
      ],
    },
    {
      id: "ung-dung-android",
      title: "Ứng dụng Android",
      group: "tinh-nang",
      intro: "Phụ đề dịch hiện nổi ngay trên video đang phát ở Bilibili, YouTube, TikTok trên điện thoại. Cần Android 10 trở lên.",
      words: "ung dung android app dien thoai apk cai dat lien ket ma ghep noi phu de noi bilibili youtube tiktok hien tren ung dung khac chia se man hinh",
      tour: "ung-dung-android",
      page: { label: "Mở Tài khoản", to: "/tai-khoan" },
      steps: [
        { text: `Cài ứng dụng: mở «Tài khoản», mục «${UI.androidApp}», bấm «Tải tệp cài». Khi điện thoại hỏi, cho phép cài từ nguồn này. Đã có bản cũ mà cài không được thì gỡ bản cũ trước.` },
        { text: `Liên kết: trên web, ở mục «${UI.androidApp}», bấm «${UI.appLinkCode}». Mã có 8 ký tự, dùng được 10 phút và một lần.` },
        { text: "Mở ứng dụng, gõ địa chỉ web (ví dụ tên trang bạn đang mở) và mã vừa lấy, bấm «Liên kết». Trên web, mục này hiện tên máy vừa liên kết." },
        { text: "Lần đầu bấm «Cho phép hiện trên ứng dụng khác» trong ứng dụng, bật quyền cho TyZo Sub rồi quay lại." },
        { text: "Chọn ngôn ngữ dịch, tiếng trong video (để «Tự nhận diện» nếu chưa rõ) và model. Tên nhân vật hay bị dịch lệch thì ghi vào «Từ cần giữ đúng», mỗi dòng «gốc = cách dịch», như trên web." },
        { text: "«Tùy chỉnh chữ» trong ứng dụng giống web: cỡ chữ, số dòng, hiện cả chữ gốc, nền đậm. Áp dụng từ lần bấm Bắt đầu sau." },
        { text: `Bấm «${UI.begin}». Android hỏi chia sẻ: chọn «Toàn bộ màn hình» nếu có. Ứng dụng chỉ lấy tiếng, không quay hình. Cho phép ghi âm nếu được hỏi.` },
        { text: "Mở video có tiếng ở ứng dụng khác. Khung phụ đề hiện trên video: kéo lên xuống để đổi chỗ, bấm «■ Dừng» trên khung khi xong." },
        { text: "Ứng dụng trừ Token dịch như Dịch trực tiếp, tính cả lúc video im lặng, cho tới khi bạn bấm Dừng. Bấm Dừng thì phần giữ thừa được trả lại." },
        { text: "Phiên gần nhất được lưu trên điện thoại: tải SRT, VTT, TXT về thư mục Tải xuống, hoặc gửi SRT sang ứng dụng khác. Bấm «Xóa bản lưu» để xóa." },
        { text: "Có bản ứng dụng mới thì ứng dụng hiện thẻ «Có bản mới». Cài bản mới mà máy báo không cài đè được thì gỡ bản cũ trước rồi liên kết lại." },
        { text: "Đổi máy hay mất máy: ở mục này trên web, bấm «Gỡ» cạnh tên máy. Mỗi tài khoản liên kết tối đa 3 máy. Đổi mật khẩu, hoặc máy không dùng quá 90 ngày, thì phải liên kết lại." },
      ],
    },
    {
      id: "thuat-ngu",
      title: "Thuật ngữ theo thể loại nội dung",
      group: "tinh-nang",
      intro: "Giúp dịch đúng từ chuyên dụng của từng thể loại.",
      words: "thuat ngu glossary the loai phim tu dien dich dung tu",
      tour: "thuat-ngu",
      steps: [
        { text: `Mở nhóm «${UI.advanced}» ở menu trái, chọn «${UI.glossary}».` },
        { text: "Chọn thể loại của nội dung. Bộ thuật ngữ có cho tiếng Nhật, Hàn, Trung và Anh." },
        { text: "Chọn «Tự động» thì app không nạp bộ thuật ngữ có sẵn. Thuật ngữ bạn tự thêm lưu trên máy này." },
      ],
    },
    {
      id: "nap-tien-goi",
      title: "Mua gói và thuê phòng",
      group: "tai-khoan",
      intro: "Thuê phòng và Token dịch đều chuyển khoản theo mã QR. Không giữ số dư.",
      words: "nap tien goi gia thue phong tra theo luot giay dich truc tiep thuyet minh vi so du chuyen khoan dung thu 24 gio 7 ngay 30 ngay",
      tour: "nap-tien",
      page: { label: "Xem bảng giá", to: "/goi" },
      steps: [
        { text: `Mua Token dịch: mở «${UI.account}» ở menu trái, chọn «${UI.wallet}», bấm gói. Mã QR hiện ra. Chuyển khoản đúng số tiền và nội dung. Đơn còn hiệu lực ${PAY_MINUTES} phút. Tiền về thì được Token dịch, không cộng số dư.` },
        { text: `Gói thuê phòng: ${planLines(plans)}. Bấm gói thì cũng hiện mã QR, chuyển khoản đúng số thì mở hạn. Trong hạn không giới hạn số tệp và được xuất file phụ đề; ${planSaving(plans)}.` },
        { text: `Dùng thử: ${TRIAL_FILES} tệp, tối đa ${TRIAL_MINUTES} phút, không quá ${megabytes(TRIAL_BYTES)} MB, không xuất file phụ đề.` },
        { text: "Trả theo lượt trừ Token dịch. Phòng giữ số ước tính, khi xong trừ số thực và trả phần thừa nếu gói còn hạn. Hết hạn thì phần còn lại mất, không hoàn tiền. Orpheus khi dùng key của phòng và giọng Aura cũng trừ Token dịch. Neural không trừ." },
        { text: "Một video giữ Token dịch hai lần: phần nhận dạng lúc bắt đầu, phần dịch lúc bắt đầu dịch. Lúc app chờ bạn xem bảng nhân vật thì không giữ gì. Dịch lại bằng model khác chỉ giữ phần dịch." },
        { text: "Dịch trực tiếp dùng cùng Token dịch. Phiên không giữ số dư. Hết Token dịch thì phiên dừng." },
        { text: "Nếu bạn dùng key Groq của mình thì Groq tính tiền nhận dạng và dịch cho bạn, phòng không trừ Token dịch cho lượt chạy đó." },
      ],
    },
    {
      id: "key-groq",
      title: "Lấy key (Groq, Alibaba, Deepgram, AssemblyAI, Speechmatics, Soniox, ElevenLabs)",
      group: "tai-khoan",
      intro: `Chọn Thuê phòng thì bạn dùng key của chính bạn. Mỗi nhà có một key riêng, nhà nào bạn dùng thì lấy key nhà đó. Dịch cần key của một nhà có model dịch (${providersWith("chat").map((id) => PROVIDERS[id].label).join(" hoặc ")}); nhận dạng cần key của nhà nhận dạng bạn chọn.`,
      words: "key groq alibaba deepgram assemblyai speechmatics soniox elevenlabs scribe api gsk sk console tao key lay key dan key khoa dashscope bailian nova whisper universal",
      tour: "key-groq",
      steps: [
        { text: "Mở trang quản lý key của Groq và đăng nhập (hoặc đăng ký) bằng tài khoản Groq.", link: { label: "console.groq.com/keys", href: "https://console.groq.com/keys" }, image: "groq-tao-key.png" },
        { text: "Chọn tạo key mới (Create API Key) và đặt tên tùy ý để bạn nhớ.", },
        { text: "Sao chép key ngay khi tạo xong, vì thường không xem lại được sau đó. Key Groq bắt đầu bằng gsk_." },
        ...PROVIDER_IDS.filter((id) => id !== "groq").map((id) => ({
          text: `${PROVIDERS[id].label}: mở trang key của ${PROVIDERS[id].label}, đăng nhập, tạo key mới và sao chép ngay. ${PROVIDERS[id].label} làm: ${providerDoes(id)}. Cách tạo y như Groq.`,
          link: { label: PROVIDERS[id].keyPage, href: `https://${PROVIDERS[id].keyPage}` },
        })),
        { text: `Quay lại app, mở «${UI.keyTab}», bấm «Thêm key», chọn nhà rồi dán key. Mỗi key hiện nhà đó làm được việc gì và key đã hợp lệ chưa; bấm Sửa để thay, bấm thùng rác để xóa. Key chỉ lưu trên máy này.` },
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
      intro: "Cần hỏi về gói, Token dịch, khóa hoặc cấm tài khoản.",
      words: "ho tro lien he zalo facebook email hoi yeu cau xem lai khieu nai ban quyen go noi dung",
      tour: "ho-tro",
      contact: true,
      page: { label: `Mở «${UI.appeal}»`, to: "/yeu-cau" },
      steps: [
        { text: `Việc cần người xem lại (gói, Token dịch, khóa, cấm): gửi ở «${UI.appeal}». Mô tả rõ việc và thời điểm xảy ra.` },
        { text: "Không gửi key hay mật khẩu trong yêu cầu." },
        {
          text: `Khiếu nại bản quyền (chủ quyền hoặc người được ủy quyền): gửi ở «${UI.appeal}» hoặc qua liên hệ bên dưới. Nêu tác phẩm, căn cứ quyền, thông tin xác định tài khoản hay lần xử lý, cách liên hệ, và cam đoan thông tin là đúng (Điều khoản, mục 3).`,
        },
      ],
    },
  ];
}

export const GUIDE_FAQ: GuideFaq[] = [
  {
    id: "khong-xuat-duoc",
    q: "Vì sao tôi không tải được file phụ đề?",
    a: "Tài khoản dùng thử, hoặc đã hết cả gói thuê phòng lẫn Token dịch, không xuất được file phụ đề. Còn gói thuê phòng hoặc còn Token dịch thì xuất được. Phụ đề trên màn hình vẫn xem được bình thường.",
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
    a: `App cần link tải thẳng về tệp video hoặc âm thanh (đuôi như .mp4, .mkv) và link phải công khai. Link trang xem phim thì không dùng được: hãy chọn tệp từ máy.`,
    words: "dan link khong chay url youtube trang xem tai tep",
  },
  {
    id: "key-groq-loi",
    q: "App báo key không hợp lệ?",
    a: `Key không hợp lệ hoặc chưa được cấp quyền. Kiểm tra lại key ở trang của nhà đó (${PROVIDER_IDS.map((id) => `${PROVIDERS[id].label}: ${PROVIDERS[id].keyPage}`).join("; ")}). Không được thì tạo key mới rồi dán lại.`,
    words: "key groq alibaba deepgram assemblyai speechmatics soniox elevenlabs khong hop le sai loi bao loi het han",
  },
  {
    id: "xoa-du-lieu",
    q: "Xóa dữ liệu trình duyệt thì mất gì?",
    a: "Key của bạn, tên video, ghi chú, thuật ngữ bạn thêm và giọng đã khóa lưu trên máy bạn nên sẽ mất. Tài khoản, Token dịch và gói thuê nằm ở phòng nên không mất.",
    words: "xoa du lieu trinh duyet cache mat key luu tren may",
  },
  {
    id: "live-khong-co-tieng",
    q: "Dịch trực tiếp không nghe được tiếng của tab?",
    a: `Khi bấm «${UI.begin}», hộp chọn của trình duyệt phải chọn đúng tab và bật mục chia sẻ âm thanh của tab. Quên bật mục đó thì app không nhận được tiếng. Máy không thu được tab thì dùng «${UI.mic}».`,
    words: "dich truc tiep khong co tieng tab chia se am thanh micro live",
  },
  {
    id: "android-khong-hien-phu-de",
    q: "Ứng dụng Android không hiện phụ đề?",
    a: "Kiểm ba chỗ: đã bật quyền hiện trên ứng dụng khác cho TyZo Sub; lúc Android hỏi chia sẻ đã bấm đồng ý; video đang phát có tiếng (tắt tiếng thì không có gì để dịch). Ứng dụng báo máy đã bị gỡ liên kết thì lấy mã mới ở Tài khoản.",
    words: "android app ung dung khong hien phu de khong co chu quyen hien tren ung dung khac chia se lien ket",
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
