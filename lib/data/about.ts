/**
 * About page content, taken from the owner's own words on the original
 * GREAT VAL Google Site and confirmed in chat. Written in the first person
 * to match the rest of the site. Edit wording here.
 */

export const aboutStandard = [
  {
    id: "shield",
    title: "The Shield",
    label: "Reliability",
    text: "A Computer Science degree from Federal University Otuoke is the technical foundation. It is the part of the brand that has to hold up: sites that load, systems that work.",
  },
  {
    id: "crown",
    title: "The Crown",
    label: "Premium quality",
    text: "The crown in the logo is a commitment to premium quality, in how the work looks, reads and performs. That is the GREATVAL standard.",
  },
] as const;

export const aboutPrinciples = [
  {
    title: "Learn through execution",
    text: "Ideas get tested by building them, not by waiting until they feel ready.",
  },
  {
    title: "Build with what you have",
    text: "Limited resources are a starting point. Results come from effort and creativity first.",
  },
  {
    title: "Experiment in public and in private",
    text: "Some tests are shared as they happen. Others stay quiet until they work.",
  },
] as const;

/** Interests the owner lists as informing the work. */
export const aboutInterests = [
  "Travel and culture",
  "Physical and mental fitness",
  "Political and social engagement",
] as const;
