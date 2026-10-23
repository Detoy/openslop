// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AudioResultPreview } from "../audio-result-preview";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

vi.mock("@/lib/components/use-peaks", () => ({
	usePeaks: () => ({ status: "ready", peaks: [] }),
}));

const container = document.body.appendChild(document.createElement("div"));
let root: Root;

beforeEach(() => {
	root = createRoot(container);
});

afterEach(() => act(() => root.unmount()));

function render(volume: number) {
	act(() =>
		root.render(
			<TooltipProvider>
				<AudioResultPreview
					status="idle"
					startedAt={null}
					error={null}
					onDiscard={() => {}}
					result={{ audioUrl: "https://audio/sfx.mp3", durationSec: 2 }}
					volume={volume}
				/>
			</TooltipProvider>,
		),
	);
	const audio = container.querySelector("audio");
	if (!audio) throw new Error("no audio rendered");
	return audio;
}

describe("AudioResultPreview", () => {
	it("plays the result at the element's volume, the gain the player applies", () => {
		expect(render(0.2).volume).toBe(0.2);
	});

	it("applies a volume change to the audio already playing", () => {
		const playing = render(0.2);

		expect(render(0.9)).toBe(playing);
		expect(playing.volume).toBe(0.9);
	});
});
