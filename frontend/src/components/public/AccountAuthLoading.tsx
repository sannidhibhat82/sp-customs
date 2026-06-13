import { Header, Footer } from '@/components/public';

export function AccountAuthLoading() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-24 pb-12 container-wide">
        <div className="animate-pulse h-40 rounded-xl bg-secondary/30" />
      </div>
      <Footer />
    </div>
  );
}
