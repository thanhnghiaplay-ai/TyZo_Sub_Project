// Kho prompt trau chuốt theo thể loại (bước A1 trong HANDOFF_NANG_CAP.md).
// Mỗi thể loại có prompt RIÊNG: giọng văn, xưng hô, mức thô tục, độ dài câu.
// Prompt này chỉ NỐI THÊM vào lệnh trau chuốt (bước A2); lệnh gốc đòi JSON giữ cố định ở nơi khác.
// Thuật ngữ của người dùng và bảng nhân vật vẫn đi kèm, prompt thể loại không thay chúng.
// File thuần, chỉ import tương đối để chạy được trong test của Node.
import { currentGenre } from "../home-state.ts";

type GenrePrompt = {
  /** Tên hiển thị tiếng Việt. */
  label: string;
  /** Gợi ý ngắn cho bước DỊCH. Chỉ cần với thể loại mà `GENRES` trong `text.ts` chưa có. */
  hint?: string;
  /** Prompt trau chuốt bản dịch tiếng Việt, viết bằng tiếng Anh cho model. */
  polish: string;
};

/** Giới hạn độ dài một prompt thể loại (ký tự), để không làm phình lệnh gửi lên model. */
export const GENRE_PROMPT_MAX = 1200;

/** Thể loại chưa có prompt riêng thì rơi về prompt này. */
export const FALLBACK_GENRE_PROMPT: GenrePrompt = {
  label: "Chung",
  polish:
    "Polish the Vietnamese subtitles so they read like natural spoken dialogue in a film. Keep each speaker's register, slang and attitude. Use the characters' pronoun pairs consistently across the scene. Prefer short, clear subtitle lines (about 40 characters per row, at most 2 rows). Fix stiff word-for-word phrasing, wrong pronouns and flat wording; do not add content, do not change facts, do not soften or censor.",
};

export const GENRE_PROMPTS: Record<string, GenrePrompt> = {
  auto: {
    label: "Tự động",
    polish:
      "First judge the genre and tone from the lines and the film context, then polish to match it: formal and period-correct for historical or martial-arts dialogue, modern and casual for everyday scenes, blunt and clipped for crime or action. Keep every speaker's register, pronoun pairs and slang. Natural Vietnamese movie-subtitle wording, short lines, no censoring or softening.",
  },
  action: {
    label: "Hành động",
    polish:
      "Action film. Make lines short, punchy and urgent; cut filler words. Commands and radio talk are clipped (Rút! Yểm trợ! Hạ mục tiêu!). Soldiers, police and agents use direct pairs (tao/mày when hostile, tôi/anh among colleagues, rank plus name for superiors). Keep weapon, rank, unit and operation names consistent. Threats and swearing stay at the original intensity.",
  },
  adventure: {
    label: "Phiêu lưu",
    polish:
      "Adventure film. Vivid, energetic, heroic but natural Vietnamese; avoid stiff literary phrasing. Banter between companions is light and quick. Keep place, treasure, item and creature names consistent with the glossary. Short lines for chases and danger, slightly fuller lines for wonder and discovery.",
  },
  crime: {
    label: "Hình sự / giang hồ",
    polish:
      "Crime, gangster or thriller. Use real Vietnamese street and underworld talk, not textbook wording; bosses and gang members commonly use tao/mày, anh/chú/đại ca. Police and lawyers speak in clipped professional jargon. Threats, insults and swearing keep the original strength; never tidy them up. Keep lines short and hard.",
  },
  scifi: {
    label: "Viễn tưởng / giả tưởng",
    polish:
      "Sci-fi or fantasy. Keep invented terms, ranks, technology, races and spell names exactly consistent with the glossary and never explain them. Technical talk is precise and dry; ordinary characters stay conversational. Avoid archaic Chinese-flavoured wording unless the setting is clearly that kind of fantasy.",
  },
  horror: {
    label: "Kinh dị",
    polish:
      "Horror. Terse, tense wording; leave silence and implication in place instead of explaining. Whispers are short and plain, screams are brief interjections. Keep creepy details concrete and do not add jokes or modern slang that break the mood.",
  },
  romance: {
    label: "Tình cảm / lãng mạn",
    polish:
      "Romance or drama. Warm, emotional, natural Vietnamese. Choose the couple's pronoun pair by their stage: anh/em for lovers, tôi/cô or cậu/tớ when still distant or young, and keep it unless the relationship visibly changes. Keep confessions and quarrels sincere and in plain words; avoid melodramatic or overly poetic phrasing the speaker would not say.",
  },
  psychological: {
    label: "Tâm lý",
    polish:
      "Psychological drama. Subtle, restrained, introspective wording; keep subtext, hesitations and unfinished sentences. Do not explain feelings the speaker leaves unsaid. Calm register, medium-length lines, precise word choice over decorative language.",
  },
  comedy: {
    label: "Hài",
    polish:
      "Comedy. Protect the joke and its timing: keep the punchline at the end of the line, adapt wordplay into a Vietnamese pun or equivalent instead of a literal translation. Use lively everyday spoken Vietnamese and fitting slang; keep lines short so they can be read in time. Do not explain the joke.",
  },
  costume: {
    label: "Cổ trang / kiếm hiệp",
    polish:
      "Costume drama and martial-arts period piece. Use period-appropriate address forms: ta/ngươi, huynh/đệ, muội, sư phụ, sư huynh, bệ hạ, thần, hạ thần, các hạ, cô nương, công tử; do not use modern pronouns like anh/em/tôi for nobles and swordsmen. Formal, slightly literary but still speakable. Keep titles, sects, techniques and place names consistent. Threats stay sharp.",
  },
  historical: {
    label: "Lịch sử / thời kỳ",
    polish:
      "Historical period drama. Formal, era-appropriate speech; match the period's courtesy forms and avoid anachronistic slang. Keep titles, ranks, offices and place names consistent with the glossary. Speeches may be fuller, ordinary talk stays plain. Do not modernize politics or insults.",
  },
  mystery: {
    label: "Trinh thám / bí ẩn",
    polish:
      "Mystery or detective. Precise wording for clues, alibis, times, places and deductions; keep names and facts identical from line to line. Interrogations are clipped, deductions are clear and logical. Keep tension without revealing more than the line says; never resolve an ambiguity the original leaves open.",
  },
  sports: {
    label: "Thể thao",
    polish:
      "Sports film. Keep sport-specific terms, positions, scores and ranks correct and consistent. Commentary is fast and energetic; coaches are blunt and motivating; teammates joke in casual tao/mày or tớ/cậu depending on age. Short punchy lines in matches, warmer fuller lines in locker-room scenes.",
  },
  adult: {
    label: "Phim có nhãn 18+",
    polish:
      "Content rated 18+ for adults. Translate strong language, violence, dark themes and sexual dialogue faithfully and idiomatically at exactly the intensity of the original, whether it is mild, suggestive or explicit: do not escalate a mild line and do not soften an explicit one. Use the natural everyday Vietnamese words a real speaker would use in that moment. Never censor, euphemize, moralize or add warnings; if a line is already faithful, leave it. Keep the speakers' pronoun pairs consistent and lines short and spoken. Do not invent words for sounds that are not speech.",
  },
  daily: {
    label: "Hằng ngày",
    polish:
      "Contemporary slice of life. Use current 2020s spoken Vietnamese: chat apps, social media, office, school, delivery, dating and city life. Keep slang modern and light; family and friends use natural pairs (con/ba má, em/anh chị, tôi/bạn, tớ/cậu). Short relaxed lines. Do not make it sound archaic or like a period drama.",
  },
  wuxia: {
    label: "Kiếm hiệp",
    hint: "Genre: wuxia / martial-arts. Use jianghu address forms (huynh, đệ, muội, sư phụ, các hạ, tại hạ, ta/ngươi); keep sects, techniques and weapon names consistent.",
    polish:
      "Wuxia (kiếm hiệp). Use jianghu speech: tại hạ, các hạ, huynh/đệ, sư phụ/sư huynh/sư muội, cô nương, lão phu, ta/ngươi. Righteous speakers are courteous and formal, villains are arrogant and cutting. Keep sect, technique, weapon, title and place names consistent with the glossary, in the Sino-Vietnamese form fans know. Lines are short and weighty, a little literary, never modern slang.",
  },
  xianxia: {
    label: "Tiên hiệp",
    hint: "Genre: xianxia / cultivation fantasy. Keep cultivation realms, techniques, artifacts and sect names in consistent Sino-Vietnamese form; ancient speech with ta/ngươi, tiền bối, đạo hữu.",
    polish:
      "Xianxia (tiên hiệp, tu tiên). Use ancient cultivator speech: ta/ngươi, bản tọa, tiền bối/vãn bối, đạo hữu, sư tôn, đệ tử. Elders and sect masters are cold and commanding; juniors are respectful. Keep cultivation realms, pills, treasures, techniques and sect names in one consistent Sino-Vietnamese form from the glossary. Dignified, slightly archaic, short lines; avoid modern pronouns and slang.",
  },
  ngontinh: {
    label: "Ngôn tình",
    hint: "Genre: Chinese-style romance drama (ngôn tình). Sweet, emotional lines; careful anh/em, chàng/nàng or ta/nàng address depending on period or modern setting.",
    polish:
      "Ngôn tình romance drama. Emotional, sweet and tender Vietnamese; decide period or modern from context. Modern: anh/em, tôi/cô, cậu/tớ. Period: chàng/nàng, ta/nàng, công tử/tiểu thư. Keep teasing, jealousy, confession and heartbreak lines natural and heartfelt, not purple or overly formal. Hold each couple's pronoun pair constant until the relationship visibly changes.",
  },
  social: {
    label: "Tâm lý xã hội",
    hint: "Genre: social drama. Realistic everyday speech about family, money, work and social pressure; plain, grounded wording with consistent family and workplace address forms.",
    polish:
      "Social-psychological drama. Realistic, grounded spoken Vietnamese about family, money, work, class and social pressure. Address forms follow the real relationship (ba má/con, anh chị em, sếp/nhân viên, hàng xóm) and stay consistent. Restrained emotion, medium-length lines, plain wording; quarrels may be sharp but not theatrical. Keep subtext and silences; do not moralize.",
  },
  war: {
    label: "Chiến tranh",
    hint: "Genre: war film. Clipped command and radio language; keep ranks, units, operations and place names consistent; threats and swearing at original intensity.",
    polish:
      "War film. Orders are short and clipped; radio talk is terse. Keep ranks, units, weapons, operations and place names consistent and correct for the period and country. Comrades speak in rough, close pairs (tao/mày, đồng chí, anh em); officers use rank plus name or title. Grief and fear are plain and short, never decorative. Swearing stays at original strength.",
  },
  family: {
    label: "Gia đình",
    hint: "Genre: family drama. Warm, natural family speech; consistent kinship address (ba/má, con, anh/chị/em, ông/bà, cháu).",
    polish:
      "Family drama. Warm, natural household Vietnamese with correct kinship address: ba/má or bố/mẹ, con, anh/chị/em, ông/bà, cháu, cô/dì/chú/bác. Keep each person's pair fixed, including how elders address children and the reverse. Affection and arguments are plain and sincere; short to medium lines, no stiff literary wording.",
  },
  school: {
    label: "Học đường / thanh xuân",
    hint: "Genre: school and youth drama. Young, casual speech: tớ/cậu, mình/bạn, light modern slang; teachers addressed as thầy/cô.",
    polish:
      "School and youth drama. Young, lively, casual Vietnamese: tớ/cậu, mình/bạn, tao/mày between close friends; students call teachers thầy/cô and refer to themselves as em/con. Light modern slang, no archaic phrasing. Crushes and teasing are shy and playful; keep lines short and quick.",
  },
  documentary: {
    label: "Tài liệu / phóng sự",
    hint: "Genre: documentary. Neutral, clear narration; precise names, figures and terms; interviewees speak plainly.",
    polish:
      "Documentary or report. Narration is neutral, clear and well-formed; interviewees speak plainly, keeping their hesitations only when meaningful. Keep names, places, dates, figures and technical terms accurate and consistent. Medium-length lines, no dramatic embellishment, no slang the speaker would not use.",
  },
};

/** Có prompt riêng cho thể loại này (không tính dự phòng) hay không. */
export function hasGenrePrompt(genre: string): boolean {
  return Object.prototype.hasOwnProperty.call(GENRE_PROMPTS, currentGenre(genre));
}

/** Prompt trau chuốt của thể loại; thể loại lạ hay để trống thì dùng prompt dự phòng. */
export function genrePrompt(genre: string): GenrePrompt {
  const key = currentGenre(genre);
  return Object.prototype.hasOwnProperty.call(GENRE_PROMPTS, key) ? GENRE_PROMPTS[key] : FALLBACK_GENRE_PROMPT;
}

/** Gợi ý ngắn cho bước dịch của thể loại mới (rỗng nếu thể loại không có gợi ý riêng). */
export function genreHint(genre: string): string {
  const key = currentGenre(genre);
  return Object.prototype.hasOwnProperty.call(GENRE_PROMPTS, key) ? GENRE_PROMPTS[key].hint || "" : "";
}
