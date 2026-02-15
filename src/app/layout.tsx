import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Soon Come? — Toronto Real-Time Transit",
  description: "Toronto real-time transit arrival information powered by GTFS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@600;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased max-w-[430px] mx-auto min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
