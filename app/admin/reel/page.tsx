import type { Metadata } from "next";
import { AdminBar } from "@/components/admin/admin-bar";
import { ReelLab } from "@/components/reel/reel-lab";

export const metadata: Metadata = { title: "Reel editor" };

export default function ReelPage() {
  return (
    <>
      <AdminBar title="Reel editor" />
      <ReelLab />
    </>
  );
}
