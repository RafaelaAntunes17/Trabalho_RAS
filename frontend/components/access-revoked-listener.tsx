"use client";

import { useAccessRevokedListener } from "@/hooks/use-access-revoked-listener";

export function AccessRevokedListener() {
  useAccessRevokedListener();
  return null;
}
