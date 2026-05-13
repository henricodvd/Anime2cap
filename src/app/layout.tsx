// Root layout — delegates <html> and <body> to [locale]/layout.tsx
// which handles i18n, fonts, metadata, and theming.

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
