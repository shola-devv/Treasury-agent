import "@fontsource/fraunces/400.css";
import "@fontsource/fraunces/500.css";
import "@fontsource/fraunces/600.css";
import "@fontsource/fraunces/400-italic.css";
import "@fontsource/fraunces/500-italic.css";
import "@fontsource/quicksand/400.css";
import "@fontsource/quicksand/500.css";
import "@fontsource/quicksand/600.css";
import "@fontsource/quicksand/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "./globals.css";

export const metadata = {
  title: "Treasury Disbursement Agent",
  description:
    "Pays out ETH per cycle only when the numbers say it's worth the gas — reasoned by Groq, executed through KeeperHub.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-body bg-cream text-ink antialiased">{children}</body>
    </html>
  );
}
