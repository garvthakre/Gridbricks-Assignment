import './globals.css';

export const metadata = {
  title: 'UK Wind Day-Ahead Procurement & Forecast Risk Portal',
  description: 'Decision support dashboard for UK day-ahead wholesale electricity procurement using Elexon wind generation and forecasts.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased flex flex-col">
        {children}
      </body>
    </html>
  );
}
