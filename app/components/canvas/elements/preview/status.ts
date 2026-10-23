import type { ReactNode } from "react";
import type { ElementSnapshot } from "@/lib/generation/snapshots";

export type GenerationState = Pick<ElementSnapshot, "status" | "startedAt">;

export type PlaceholderProps = GenerationState & {
	error: string | null;
	onDiscard: () => void;
};

export type PreviewOverlays = {
	topRight?: ReactNode;
};

export type ElementPreviewProps = PlaceholderProps &
	PreviewOverlays & {
		result: ElementSnapshot["result"];
		/** Playback gain for audio output, 0 to 1, from the element's Volume. */
		volume?: number;
	};
