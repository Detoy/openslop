"use client";

import type { ReactNode } from "react";
import { AlertCircle, Hourglass, Sparkles } from "@/components/ui/icon";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
	isGenerationActive,
	type GenerationStatus,
} from "@/lib/generation/snapshots";
import type { GenerationHold } from "@/lib/generation/generation-holds";
import { useGenerationHoldsSelector } from "@/lib/generation/generation-holds-provider";
import { useElementGeneration } from "./element-generation-context";

export function StaleIndicator({ reason }: { reason: string }) {
	return (
		<SimpleTooltip label={reason}>
			<Badge variant="tertiary" className="text-label-xs">
				<AlertCircle />
				Stale
			</Badge>
		</SimpleTooltip>
	);
}

export function ElementStaleIndicator() {
	const { staleReason } = useElementGeneration();
	if (!staleReason) return null;
	return <StaleIndicator reason={staleReason} />;
}

const GENERATE_ICON: Record<GenerationStatus, ReactNode> = {
	generating: <Spinner className="text-current" />,
	queued: <Hourglass aria-hidden="true" />,
	idle: <Sparkles aria-hidden="true" />,
};

function generateLabel(
	status: GenerationStatus,
	hasResult: boolean,
	hold: GenerationHold | undefined,
) {
	if (status === "generating") return "Generating…";
	if (status === "queued") return "Queued";
	if (hold) return hold.label;
	return hasResult ? "Regenerate" : "Generate";
}

function generateTooltip(hasResult: boolean, hold: GenerationHold | undefined) {
	if (hold) return hold.reason;
	return hasResult ? "Regenerate this element" : "Generate this element";
}

export function GenerateButton({
	status,
	hasResult,
	hold,
	disabled,
	onGenerate,
}: {
	status: GenerationStatus;
	hasResult: boolean;
	hold: GenerationHold | undefined;
	disabled: boolean;
	onGenerate: () => void;
}) {
	const label = generateLabel(status, hasResult, hold);
	return (
		<Button
			type="button"
			variant="generate"
			size="sm"
			className="shrink-0"
			disabled={disabled}
			unavailable={hold !== undefined}
			onMouseDown={(e) => e.preventDefault()}
			onClick={onGenerate}
			aria-label={label}
			tooltip={generateTooltip(hasResult, hold)}
		>
			{GENERATE_ICON[status]}
			{label}
		</Button>
	);
}

export function ElementGenerateButton() {
	const { node, hasPrompt, hasResult, status, generate } =
		useElementGeneration();
	const hold = useGenerationHoldsSelector((holds) => holds.holdOn(node.id));
	return (
		<GenerateButton
			status={status}
			hasResult={hasResult}
			hold={hold}
			disabled={!hasPrompt || isGenerationActive(status)}
			onGenerate={generate}
		/>
	);
}
