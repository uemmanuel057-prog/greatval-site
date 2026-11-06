import type { Metadata } from "next";
import { AdminBar } from "@/components/admin/admin-bar";
import { GraphicsGenerator } from "@/components/graphics-generator/graphics-generator";

export const metadata: Metadata = { title: "Graphics Generator" };

export default function GraphicsPage() {
  return (
    <>
      <AdminBar title="Graphics Generator" />
      <GraphicsGenerator />
    </>
  );
}
