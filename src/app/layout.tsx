import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import ConvexClientProvider from "./convex-client-provider";
import { Footer } from "~/components/footer";
import { Header } from "~/components/header";

export const metadata: Metadata = {
  title: "Conflict intake",
  description: "AI-assisted conflict intake",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body className="bg-background min-h-dvh w-full min-w-0 antialiased">
        <ClerkProvider>
          <ConvexClientProvider>
            <div className="flex min-h-dvh w-full min-w-0 flex-col">
              <Header />
              <main className="flex min-h-0 min-w-0 flex-1 flex-col">
                {children}
              </main>
              <Footer />
            </div>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
