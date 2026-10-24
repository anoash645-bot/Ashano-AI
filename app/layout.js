import "./globals.css";
import "katex/dist/katex.min.css";
export const metadata = {
  title: "Ashano AI — Your World. Your Intelligence.",
  description: "Ashano AI: asisten AI pribadi yang cerdas, ramah, dan elegan, diciptakan oleh Richmond Longdong.",
  icons: { icon: "/favicon.svg" },
  openGraph: { title: "Ashano AI", description: "Your World. Your Intelligence.", type: "website" },
};
export const viewport = { width: "device-width", initialScale: 1, themeColor: "#0B0710" };
export default function RootLayout({ children }) {
  return (<html lang="id" className="dark" suppressHydrationWarning><body>{children}</body></html>);
}
