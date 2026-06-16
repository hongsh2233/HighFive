import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TMS - 업무 관리 시스템",
  description: "AI 기반 경량 업무 관리 플랫폼",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
