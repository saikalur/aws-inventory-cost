import type { Metadata } from "next";
import "./globals.css";
import { ProfileProvider } from "@/lib/ProfileContext";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "AWS Inventory & Cost Reporter",
  description: "Visualize AWS resources and costs",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0f1117] text-[#e4e6f0] antialiased">
        <ProfileProvider>
          <Header />
          <main className="h-[calc(100vh-65px)]">{children}</main>
        </ProfileProvider>
      </body>
    </html>
  );
}
