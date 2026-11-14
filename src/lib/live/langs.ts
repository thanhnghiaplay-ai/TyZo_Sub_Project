/**
 * Ngôn ngữ của Qwen LiveTranslate (60 ngôn ngữ: 29 có cả tiếng lẫn chữ, 31 chỉ có chữ).
 * Nguồn: tài liệu Alibaba Model Studio "Real-time audio and video translation - Qwen", cập nhật 13/11/2026.
 */
export type LiveLang = { code: string; name: string; audio: boolean };

const A = (code: string, name: string): LiveLang => ({ code, name, audio: true });
const T = (code: string, name: string): LiveLang => ({ code, name, audio: false });

export const LIVE_LANGS: LiveLang[] = [
  A("zh", "Tiếng Trung"), A("en", "Tiếng Anh"), A("ar", "Tiếng Ả Rập"), A("de", "Tiếng Đức"), A("fr", "Tiếng Pháp"),
  A("es", "Tiếng Tây Ban Nha"), A("pt", "Tiếng Bồ Đào Nha"), A("id", "Tiếng Indonesia"), A("it", "Tiếng Ý"), A("ko", "Tiếng Hàn"),
  A("ru", "Tiếng Nga"), A("th", "Tiếng Thái"), A("vi", "Tiếng Việt"), A("ja", "Tiếng Nhật"), A("tr", "Tiếng Thổ Nhĩ Kỳ"),
  A("hi", "Tiếng Hindi"), A("ms", "Tiếng Mã Lai"), A("nl", "Tiếng Hà Lan"), A("ur", "Tiếng Urdu"), A("nb", "Tiếng Na Uy"),
  A("sv", "Tiếng Thụy Điển"), A("da", "Tiếng Đan Mạch"), A("he", "Tiếng Do Thái"), A("fi", "Tiếng Phần Lan"), A("pl", "Tiếng Ba Lan"),
  A("is", "Tiếng Iceland"), A("cs", "Tiếng Séc"), A("fil", "Tiếng Filipino"), A("fa", "Tiếng Ba Tư"),
  T("yue", "Tiếng Quảng Đông"), T("el", "Tiếng Hy Lạp"), T("af", "Tiếng Afrikaans"), T("ast", "Tiếng Asturias"), T("be", "Tiếng Belarus"),
  T("bg", "Tiếng Bulgaria"), T("bn", "Tiếng Bengal"), T("bs", "Tiếng Bosnia"), T("ca", "Tiếng Catalan"), T("ceb", "Tiếng Cebuano"),
  T("et", "Tiếng Estonia"), T("gl", "Tiếng Galicia"), T("gu", "Tiếng Gujarat"), T("hr", "Tiếng Croatia"), T("hu", "Tiếng Hungary"),
  T("jv", "Tiếng Java"), T("kk", "Tiếng Kazakh"), T("kn", "Tiếng Kannada"), T("ky", "Tiếng Kyrgyz"), T("lv", "Tiếng Latvia"),
  T("mk", "Tiếng Macedonia"), T("ml", "Tiếng Malayalam"), T("mr", "Tiếng Marathi"), T("pa", "Tiếng Punjab"), T("ro", "Tiếng Romania"),
  T("sk", "Tiếng Slovakia"), T("sl", "Tiếng Slovenia"), T("sw", "Tiếng Swahili"), T("tg", "Tiếng Tajik"), T("az", "Tiếng Azerbaijan"),
  T("uk", "Tiếng Ukraina"),
];

export function liveLang(code: string): LiveLang | null {
  return LIVE_LANGS.find((lang) => lang.code === code) ?? null;
}

/** Đích có tiếng nói thì mới bật âm thanh dịch được. */
export function targetHasVoice(code: string): boolean {
  return liveLang(code)?.audio === true;
}
