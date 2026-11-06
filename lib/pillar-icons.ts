import { BookOpen, Cpu, Megaphone, Radio, type LucideIcon } from "lucide-react";

/** One icon per pillar id, shared by the Pillars page and the home story. */
export const pillarIcons: Record<string, LucideIcon> = {
  creator: Radio,
  marketing: Megaphone,
  tech: Cpu,
  public: BookOpen,
};
