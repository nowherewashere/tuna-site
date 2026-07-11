"use client";

import { api, type OnboardingConfig } from "@/lib/api";
import { createCachedResource } from "@/lib/createCachedResource";

// Module-level cache so both the onboarding and cabinet screens share one fetch.
const onboarding = createCachedResource<OnboardingConfig>(() => api.onboardingConfig());

export function useOnboarding(): OnboardingConfig | null {
  return onboarding.useResource();
}
