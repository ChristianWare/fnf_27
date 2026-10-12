"use client";

// Copies the report's own link, for texting it to whoever handles the site.

import { useState } from "react";
import Button from "@/components/shared/Button/Button";

export default function CopyLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button
      btnType='white'
      text={copied ? "Link copied" : "Copy link"}
      onClick={copy}
    />
  );
}
