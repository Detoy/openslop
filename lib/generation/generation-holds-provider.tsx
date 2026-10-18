"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createStoreContext } from "@/lib/store/create-store-context";
import { GenerationHolds, type GenerationHold } from "./generation-holds";

const [GenerationHoldsContext, useGenerationHolds, useGenerationHoldsSelector] =
	createStoreContext<GenerationHolds>("GenerationHoldsContext");
export { useGenerationHolds, useGenerationHoldsSelector };

export function GenerationHoldsProvider({ children }: { children: ReactNode }) {
	const [holds] = useState(() => new GenerationHolds());
	return (
		<GenerationHoldsContext value={holds}>{children}</GenerationHoldsContext>
	);
}

/** Holds generation for as long as `hold` is set; pass a stable value. */
export function useHoldGeneration(hold: GenerationHold | undefined) {
	const holds = useGenerationHolds();
	useEffect(() => (hold ? holds.begin(hold) : undefined), [holds, hold]);
}
