import Link from 'next/link';
import { Briefcase, Users, LayoutDashboard, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      {/* Subtle Background Pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      </div>

      {/* Header */}
      <header className="p-6 md:p-10 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
            <ShieldCheck className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tighter">Vaccine<span className="text-neutral-400 font-normal">Manager</span></h1>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative z-10">
        <div className="max-w-4xl w-full text-center mb-16 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-4 animate-fade-in">
            <Zap className="w-3 h-3 text-yellow-500" />
            Next Generation Healthcare
          </div>
          <h2 className="text-5xl md:text-7xl font-black tracking-tight leading-[0.9] text-black">
            The Hub for <br />
            <span className="text-neutral-300">Fast Vaccination.</span>
          </h2>
          <p className="text-lg md:text-xl text-neutral-500 max-w-2xl mx-auto font-medium leading-relaxed">
            Secure, localized, and ultra-efficient management for vaccination centers.
            Choose your portal below to get started.
          </p>
        </div>

        {/* CTA Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
          {/* Doctor Kickstart Card */}
          <Link
            href="/admin/login"
            className="group relative bg-black text-white p-8 md:p-10 rounded-[2.5rem] overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98] flex flex-col justify-between min-h-[320px]"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-white/20 transition-all duration-700" />
            <div className="relative z-10">
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md group-hover:bg-white/20 transition-colors">
                <Briefcase className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-3xl font-bold mb-3">Doctor Kickstart</h3>
              <p className="text-neutral-400 text-lg leading-relaxed max-w-[240px]">
                Staff portal for inventory, patient history, and session management.
              </p>
            </div>
            <div className="relative z-10 flex items-center gap-2 text-white font-bold text-lg group-hover:gap-4 transition-all">
              Initialize Dashboard <ArrowRight className="w-5 h-5" />
            </div>
          </Link>

          {/* Patient Check-in Card */}
          <Link
            href="/checkin"
            className="group relative bg-neutral-100 text-black p-8 md:p-10 rounded-[2.5rem] overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:bg-neutral-200 active:scale-[0.98] flex flex-col justify-between min-h-[320px]"
          >
            <div className="relative z-10">
              <div className="w-14 h-14 bg-black/5 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-black/10 transition-colors">
                <Users className="w-7 h-7 text-black" />
              </div>
              <h3 className="text-3xl font-bold mb-3">Patient Check-in</h3>
              <p className="text-neutral-500 text-lg leading-relaxed max-w-[240px]">
                Quick registration and queue status for patients arriving at the center.
              </p>
            </div>
            <div className="relative z-10 flex items-center gap-2 text-black font-bold text-lg group-hover:gap-4 transition-all">
              Enter Queue <ArrowRight className="w-5 h-5" />
            </div>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-10 border-t border-neutral-100 mt-12 flex flex-col md:flex-row justify-between items-center gap-6 text-neutral-400 text-sm font-medium">
        <p>© 2026 Vaccination Omni. Built for speed.</p>
        <div className="flex gap-8">
          <Link href="/admin/login" className="hover:text-black transition-colors">Admin Portal</Link>
          <Link href="/checkin" className="hover:text-black transition-colors">Queue System</Link>
        </div>
      </footer>
    </div>
  );
}
