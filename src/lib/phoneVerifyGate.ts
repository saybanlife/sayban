/**
 * Opens the in-app phone OTP dialog for guests / unverified users.
 */

import {
  ensureVerifiedPublicAuth,
  type PhoneVerifyOpenRequest
} from "./publicAuthGate";

export type PhoneVerifyRequest = PhoneVerifyOpenRequest;

/** @deprecated Prefer ensureVerifiedPublicAuth — kept as a thin alias. */
export function requestPhoneVerification(
  request: PhoneVerifyRequest = {}
): boolean {
  return ensureVerifiedPublicAuth({
    onVerified: request.onVerified,
    message: request.message
  });
}
