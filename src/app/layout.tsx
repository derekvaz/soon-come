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
          href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
