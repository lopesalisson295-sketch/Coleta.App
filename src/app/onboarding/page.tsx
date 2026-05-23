import { OnboardingCarousel } from "@/components/onboarding/OnboardingCarousel"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Onboarding | ColetaMax",
}

export default function OnboardingPage() {
  return <OnboardingCarousel />
}
