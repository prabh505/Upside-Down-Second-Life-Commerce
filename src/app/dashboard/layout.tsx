import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Seller Co-pilot Dashboard — Second Life Commerce",
  description:
    "Aggregate grading results, routing distribution, recovered value, and landfill diversion stats for sellers managing multiple SKUs.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
