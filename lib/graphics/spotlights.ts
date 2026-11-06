import { services } from "@/lib/data/services";

export interface SpotlightPreset {
  id: string;
  label: string;
  headline: string;
  body: string;
  cta: string;
}

/** Default headline and call to action per service. Every field is editable in the tool. */
const copy: Record<string, { headline: string; cta: string }> = {
  web: { headline: "Professional Website Design", cta: "Need a website? Contact me" },
  brand: { headline: "Brand Consulting", cta: "Let's shape your brand. Contact me" },
  marketing: { headline: "Meta & Google Ads Management", cta: "Ready to get seen? Contact me" },
  copy: { headline: "Copywriting & Ghostwriting", cta: "Need the right words? Contact me" },
  video: { headline: "Video Editing & Motion Graphics", cta: "Got footage? Let's edit it" },
  broadcast: { headline: "Multi-Cam Live Broadcasting", cta: "Going live? Contact me" },
  events: { headline: "Event Planning & Management", cta: "Planning an event? Contact me" },
  tech: { headline: "Automation & Tech Solutions", cta: "Let's build your system. Contact me" },
};

export const spotlightPresets: SpotlightPreset[] = services.map((service) => ({
  id: service.id,
  label: copy[service.id]?.headline ?? service.title,
  headline: copy[service.id]?.headline ?? service.title,
  body: service.description,
  cta: copy[service.id]?.cta ?? "Contact me",
}));
