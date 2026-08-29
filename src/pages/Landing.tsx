import { motion } from "framer-motion";
import {
  Shield,
  MapPin,
  Phone,
  Clock,
  Users,
  ChevronRight,
  Zap,
  Eye,
  AlertTriangle,
  Heart,
} from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } },
};

function RouteDemo() {
  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="relative bg-card rounded-2xl border border-border/60 p-6 shadow-lg shadow-primary/5">
        {/* Fake map background */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden opacity-20">
          <div className="w-full h-full bg-gradient-to-br from-accent/30 via-primary/10 to-transparent" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-xs font-medium text-muted-foreground">
              AI-Powered Route Analysis
            </span>
          </div>

          {/* Route cards */}
          <div className="space-y-3">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center justify-between p-3 rounded-xl bg-safe/10 border border-safe/20"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-safe/20 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-safe" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Safest Route
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Via Connaught Place
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-safe">92%</p>
                <p className="text-[10px] text-muted-foreground">
                  42 min • 18 km
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45 }}
              className="flex items-center justify-between p-3 rounded-xl bg-balanced/10 border border-balanced/20"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-balanced/20 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-balanced" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Balanced Route
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Via Nehru Place
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-balanced">71%</p>
                <p className="text-[10px] text-muted-foreground">
                  35 min • 15 km
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="flex items-center justify-between p-3 rounded-xl bg-fast/10 border border-fast/20"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-fast/20 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-fast" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Fastest Route
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Via Ring Road
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-fast">45%</p>
                <p className="text-[10px] text-muted-foreground">
                  28 min • 13 km
                </p>
              </div>
            </motion.div>
          </div>

          {/* Safety factors */}
          <div className="mt-4 pt-4 border-t border-border/60">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-medium">
              AI Analysis Factors
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Lighting", value: "Good", icon: Eye },
                { label: "Police", value: "Nearby", icon: Shield },
                { label: "Hospitals", value: "2 on route", icon: Heart },
              ].map((f) => (
                <div key={f.label} className="text-center">
                  <f.icon className="w-3.5 h-3.5 mx-auto text-accent mb-1" />
                  <p className="text-[10px] font-medium text-foreground">
                    {f.value}
                  </p>
                  <p className="text-[9px] text-muted-foreground">{f.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <MapPin className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              Where<span className="text-accent">हो</span>
            </span>
          </div>
          <Button
            size="sm"
            className="rounded-full px-5"
            onClick={() => navigate("/auth")}
          >
            Sign In
            <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-transparent" />
        <div className="max-w-6xl mx-auto px-6 pt-20 pb-16 lg:pt-28 lg:pb-24 relative">
          <motion.div
            initial="initial"
            animate="animate"
            variants={stagger}
            className="max-w-3xl"
          >
            <motion.div variants={fadeUp} className="mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold border border-accent/20">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                AI-Powered Safety for Women
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] text-foreground"
            >
              Every route, scored
              <br />
              <span className="text-accent">by intelligence.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-xl"
            >
              Where<span className="text-accent font-semibold">हो</span> is an
              AI-powered route planner that evaluates every path through
              street lighting, police and hospital proximity, population
              density, and real-time crime data — so you arrive safe, every time.
            </motion.p>

            <motion.div
              variants={fadeUp}
              className="mt-8 flex flex-wrap gap-3"
            >
              <Button
                size="lg"
                className="rounded-full px-7"
                onClick={() => navigate("/auth")}
              >
                Plan a Safe Route
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full px-7"
                onClick={() => navigate("/auth")}
              >
                Explore the Platform
              </Button>
            </motion.div>
          </motion.div>

          {/* Route demo card */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="mt-14 lg:mt-16"
          >
            <RouteDemo />
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 border-t border-border/40">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl font-bold tracking-tight">
              Engineered for women's safety
            </h2>
            <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
              Every feature is built around one objective: ensuring you get home safely, every single time.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: Shield,
                title: "AI-Scored Route Selection",
                desc: "Three routes — safest, balanced, and fastest — each ranked by AI analysis of lighting, infrastructure, and crime patterns.",
                color: "bg-safe/10 text-safe",
              },
              {
                icon: Clock,
                title: "Time-Aware Scoring",
                desc: "Safety scores adapt throughout the day, reflecting real conditions at midnight versus midday.",
                color: "bg-accent/10 text-accent",
              },
              {
                icon: Phone,
                title: "One-Tap Emergency Response",
                desc: "Instantly contacts emergency services and alerts your trusted circle with your precise location.",
                color: "bg-fast/10 text-fast",
              },
              {
                icon: Users,
                title: "Verified Safety Check-ins",
                desc: "Periodic check-ins confirmed via biometric or password. Miss three, and your trusted contacts are notified immediately.",
                color: "bg-primary/10 text-primary",
              },
              {
                icon: MapPin,
                title: "Real-Time Route Monitoring",
                desc: "Detects and alerts your trusted contacts the moment your path deviates from the planned route.",
                color: "bg-balanced/10 text-balanced",
              },
              {
                icon: Heart,
                title: "Journey Notifications",
                desc: "Your trusted contact receives your origin, destination, and estimated arrival the moment your journey begins.",
                color: "bg-accent/10 text-accent",
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="group p-6 rounded-2xl bg-card border border-border/60 hover:border-border transition-all hover:shadow-md"
              >
                <div
                  className={`w-10 h-10 rounded-xl ${feature.color} flex items-center justify-center mb-4`}
                >
                  <feature.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-foreground mb-1.5">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-border/40">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold tracking-tight">
              Safety should never be left to chance
            </h2>
            <p className="mt-3 text-muted-foreground max-w-md mx-auto mb-8">
              Join thousands of women across India choosing smarter, AI-powered routes every day.
            </p>
            <Button
              size="lg"
              className="rounded-full px-8"
              onClick={() => navigate("/auth")}
            >
              Get Started
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <MapPin className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold">
              Where<span className="text-accent">हो</span>
            </span>
          </div>            <p className="text-xs text-muted-foreground">
            Designed for women's safety across India. Powered by AI. Built with care.
          </p>
        </div>
      </footer>
    </div>
  );
}
