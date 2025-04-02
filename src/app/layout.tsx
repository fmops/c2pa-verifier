import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "C2PA Image Verification Tool",
  description: "Verify if an image contains a C2PA manifest and check its authenticity",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="bg-gray-800 text-white p-4">
          <div className="container mx-auto flex space-x-4">
            <Link href="/" className="hover:text-gray-300">
              Verify
            </Link>
            <Link href="/create" className="hover:text-gray-300">
              Create & Sign
            </Link>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
