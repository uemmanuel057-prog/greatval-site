import type { Metadata } from "next";
import { AdminBar } from "@/components/admin/admin-bar";
import { ThreePreview } from "@/components/three/preview";

export const metadata: Metadata = { title: "3D preview" };

export default function ThreePreviewPage() {
  return (
    <>
      <AdminBar title="3D preview" />
      <ThreePreview />
    </>
  );
}
