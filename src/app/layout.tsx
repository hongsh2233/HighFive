import type { Metadata } from "next";
import Script from "next/script";
import Providers from "@/components/Providers";
import LayoutWrapper from "@/components/LayoutWrapper";
import "./globals.css";

const siteUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "High5 - 업무 관리 시스템",
    template: "%s | High5",
  },
  description: "노션보다 단순하게, 지라보다 가볍게 — 업무·프로젝트·위키·회의록·캘린더를 한 곳에서 관리하고 AI가 자동화하는 팀 협업 플랫폼",
  openGraph: {
    title: "High5 - 업무 관리 시스템",
    description: "노션보다 단순하게, 지라보다 가볍게 — 업무·프로젝트·위키·회의록·캘린더를 한 곳에서 관리하고 AI가 자동화하는 팀 협업 플랫폼",
    url: siteUrl,
    siteName: "High5",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "High5 - 업무 관리 시스템",
    description: "노션보다 단순하게, 지라보다 가볍게 — AI가 자동화하는 팀 협업 플랫폼",
  },
};

const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        {gaId && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
            <Script id="ga-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}');
              `}
            </Script>
          </>
        )}
        <Providers>
          <LayoutWrapper>{children}</LayoutWrapper>
        </Providers>
      </body>
    </html>
  );
}
