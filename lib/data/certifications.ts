import type { Certification } from "@/lib/types";

/**
 * Certificates of completion issued by AQskill, copied from the certificates
 * themselves. Newest first. Each one can be checked at the issuer's own verify
 * page using its certificate ID. Check the IDs and dates against the originals
 * before publishing.
 */
export const certificationVerifyUrl = "https://www.aqskill.org/verify";

export const certifications: Certification[] = [
  {
    id: "proposal-writing",
    title: "Professional Business Proposal Writing: From Beginner to Mastery",
    issuer: "AQskill",
    date: "3 Nov 2025",
    certificateId: "187475A97693",
    supports: "Proposals and brand consulting",
  },
  {
    id: "virtual-assistance",
    title: "Professional Virtual Assistance Course",
    issuer: "AQskill",
    date: "1 Nov 2025",
    certificateId: "270498A97693",
    supports: "Client support and operations",
  },
  {
    id: "motion-design",
    title: "Motion Design: Mastering Smartphone Video Ads in Minutes",
    issuer: "AQskill",
    date: "16 Oct 2025",
    certificateId: "1578A97693",
    supports: "Video editing and motion graphics",
  },
  {
    id: "social-media-management",
    title: "Mastering Social Media Management (From Basics to Pro)",
    issuer: "AQskill",
    date: "9 Oct 2025",
    certificateId: "1099A97693",
    supports: "Social media and brand growth",
  },
  {
    id: "content-creation",
    title: "Content Creation and Going Viral on Social Media",
    issuer: "AQskill",
    date: "6 Oct 2025",
    certificateId: "254073A97693",
    supports: "Content creation and storytelling",
  },
];
