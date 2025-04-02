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
        <nav className="bg-gray-800 text-white p-3">
          <div className="container mx-auto flex space-x-4">
            <Link href="/" className="hover:text-gray-300">
              Verify
            </Link>
            <Link href="/create" className="hover:text-gray-300">
              Create & Sign
            </Link>
          </div>
        </nav>
        <div className="min-h-[70vh]">{children}</div>
        <footer className="bg-gray-800 text-gray-300 py-4">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="mb-2 md:mb-0">
                <p className="text-sm">
                  Powered by <a href="https://blueteam.ai" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 font-semibold">blueteam.ai</a>
                </p>
              </div>
              <div className="text-sm">
                <p>© {new Date().getFullYear()} Blueteam AI. All rights reserved.</p>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
