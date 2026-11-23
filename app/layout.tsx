import type { Metadata } from "next";
import "./globals.css";
import "./live-office.css";

export const metadata: Metadata = {
  title: "My Office",
  description: "실시간 게임형 오피스",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@700;900&family=Noto+Sans+KR:wght@400;700;900&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
