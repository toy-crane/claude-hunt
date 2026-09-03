"use client";

import { Button } from "@shared/ui/button";
import { useState } from "react";

import { EMAIL_MARKETING_CONSENT_DETAILS } from "../model/constants";

export interface EmailMarketingConsentDetailsProps {
  label: string;
}

export function EmailMarketingConsentDetails({
  label,
}: EmailMarketingConsentDetailsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="text-xs">
      <Button
        aria-expanded={isOpen}
        className="h-auto p-0 text-xs"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
        variant="link"
      >
        {label}
      </Button>
      {isOpen ? (
        <dl className="mt-3 grid gap-2 rounded-md bg-muted/50 p-3">
          {EMAIL_MARKETING_CONSENT_DETAILS.map((detail) => (
            <div className="grid gap-0.5" key={detail.label}>
              <dt className="font-medium text-foreground">{detail.label}</dt>
              <dd className="text-muted-foreground">{detail.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
