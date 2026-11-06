import Image, { type StaticImageData } from "next/image";
import { Parallax } from "@/components/motion/parallax";
import { TiltCard } from "@/components/motion/tilt-card";

interface PortraitProps {
  src: StaticImageData;
  alt: string;
  /** Tailwind aspect class, e.g. "aspect-[4/5]". */
  aspect?: string;
  /** Tailwind object-position class to keep the face in frame. */
  position?: string;
  sizes: string;
  priority?: boolean;
  /** Parallax zoom and drift. Use zoom 1 / drift 0 to show the full photo. */
  zoom?: number;
  drift?: number;
  className?: string;
}

/** Glass-framed portrait with border beam, 3D tilt, and slow parallax. */
export function Portrait({
  src,
  alt,
  aspect = "aspect-[4/5]",
  position = "object-center",
  sizes,
  priority = false,
  zoom = 1.12,
  drift = 22,
  className = "",
}: PortraitProps) {
  return (
    <TiltCard className={`rounded-3xl ${className}`} max={5}>
      <div
        data-beam="always"
        className={`glass beam relative ${aspect} overflow-hidden rounded-3xl`}
      >
        <Parallax className="absolute inset-0" scale={zoom} offset={drift}>
          <Image
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            priority={priority}
            placeholder="blur"
            className={`object-cover ${position}`}
          />
        </Parallax>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-canvas/60 via-transparent to-transparent"
        />
      </div>
    </TiltCard>
  );
}
