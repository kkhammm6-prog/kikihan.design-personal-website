import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kiki Han — Experience Designer",
  description: "Selected work by Kiki Han (Weiqi Han), an experience designer working across UX/UI and HCI.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
