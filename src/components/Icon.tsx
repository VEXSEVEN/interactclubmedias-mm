import {
  ArrowDown, ArrowUp, Bell, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Code2, Download, Ellipsis, EllipsisVertical, File, FileText, Folder,
  Image as ImageIcon, KeyRound, LayoutDashboard, List, LogOut, MapPin, Pipette, Plus, Puzzle, Settings, Share, Shuffle, SlidersHorizontal, Trash2, Trophy, User, X,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  form: FileText, user: User, pin: MapPin, sliders: SlidersHorizontal, code: Code2, key: KeyRound, bell: Bell, trophy: Trophy, check: Check, plus: Plus,
  trash: Trash2, up: ArrowUp, down: Download, arrowdown: ArrowDown, chevron: ChevronRight, back: ChevronLeft, chevdown: ChevronDown, dash: LayoutDashboard,
  list: List, puzzle: Puzzle, gear: Settings, image: ImageIcon, out: LogOut, shuffle: Shuffle, folder: Folder, file: File, x: X, calendar: CalendarDays,
  share: Share, more: Ellipsis, morev: EllipsisVertical, pipette: Pipette,
};

export default function Icon({ n, size = 22 }: { n: string; size?: number }) {
  const C = ICONS[n] || Check;
  return <C size={size} strokeWidth={1.9} aria-hidden />;
}
