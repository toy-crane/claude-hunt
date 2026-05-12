// Re-export the shared nickname schema from the profile entity.
// Settings does not own the rule — `entities/profile` is the single
// source of truth for the policy, shared with onboarding.
export {
  DISPLAY_NAME_POLICY_MESSAGE,
  DISPLAY_NAME_REQUIRED_MESSAGE,
  displayNameSchema,
} from "@entities/profile";
