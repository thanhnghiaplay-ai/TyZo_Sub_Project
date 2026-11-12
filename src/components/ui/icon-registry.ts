import {
  ArrowsClockwise, Bell, BookOpen, Camera, CaretDown, CaretRight, ChartBar, CheckCircle, Clock, Coins, Copy, CornersOut, Crown,
  Cube, DownloadSimple, Envelope, Eye, FilmStrip, Funnel, GearSix, Globe, Headphones, Heart, House, Image, Info, Key, Lightning,
  Link, List, Lock, MagnifyingGlass, Microphone, Minus, Moon, Palette, Pause, PencilSimple, Play, Plus, QrCode, Question,
  ShieldCheck, SignIn, SignOut, Sparkle, SpeakerHigh, Star, Stop, Subtitles, Sun, TextAa, Translate, Trash, UploadSimple, User,
  UsersThree, Wallet, Warning, Waveform, X, XCircle,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";

/**
 * Danh sách icon cho phép dùng. Khóa là tên Phosphor (MIT).
 * Thêm icon mới: import ở trên và thêm một dòng ở dưới. Admin sẽ thấy ngay trong ô chọn icon.
 */
export const ICONS: Record<string, PhosphorIcon> = {
  ArrowsClockwise, Bell, BookOpen, Camera, CaretDown, CaretRight, ChartBar, CheckCircle, Clock, Coins, Copy, CornersOut, Crown,
  Cube, DownloadSimple, Envelope, Eye, FilmStrip, Funnel, GearSix, Globe, Headphones, Heart, House, Image, Info, Key, Lightning,
  Link, List, Lock, MagnifyingGlass, Microphone, Minus, Moon, Palette, Pause, PencilSimple, Play, Plus, QrCode, Question,
  ShieldCheck, SignIn, SignOut, Sparkle, SpeakerHigh, Star, Stop, Subtitles, Sun, TextAa, Translate, Trash, UploadSimple, User,
  UsersThree, Wallet, Warning, Waveform, X, XCircle,
};

export const ICON_KEYS = Object.keys(ICONS).sort();
