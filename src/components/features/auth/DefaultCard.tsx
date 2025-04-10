"use client";
import { OryCardProps } from "@ory/elements-react";

export function DefaultCard({ children }: OryCardProps) {
  return (
    <div className="flex flex-1 sm:items-center justify-center font-sans items-start w-full sm:w-[480px] sm:max-w-[480px]">
      <div className="relative grid grid-cols-1 gap-8 sm:rounded-cards sm:border border-form-border-default bg-form-background-default px-8 py-12 sm:px-12 sm:py-14 border-b w-full">
        {children}
      </div>
    </div>
  );
}
