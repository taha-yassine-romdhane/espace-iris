import Header from "@/components/welcome/Header";
import HeroSection from "@/components/welcome/HeroSection";
import AnimatedFeaturesShowcase from "@/components/welcome/AnimatedFeaturesShowcase";
import PartnershipSection from "@/components/welcome/PartnershipSection";
import PricingSection from "@/components/welcome/PricingSection";
import ContactSection from "@/components/welcome/ContactSection";
import CTASection from "@/components/welcome/CTASection";
import Footer from "@/components/welcome/Footer";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";

// Main Welcome Page Component
export default function Welcome() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role) {
      const role = (session.user.role as string).toLowerCase();
      router.push(`/roles/${role}`);
    }
  }, [status, router, session]);

  return (
    <div>
      <Header />
      <HeroSection />
      <AnimatedFeaturesShowcase />
      <PartnershipSection />
      <PricingSection />
      <ContactSection />
      <CTASection />
      <Footer />
    </div>
  );
}