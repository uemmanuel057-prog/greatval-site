import type { Metadata } from "next";
import { AdminBar } from "@/components/admin/admin-bar";
import { CommandCenter } from "@/components/schedule/command-center";

export const metadata: Metadata = { title: "Social Media Command Center" };

export default function SchedulePage() {
  return (
    <>
      <AdminBar title="Command Center" />
      <CommandCenter />
    </>
  );
}
