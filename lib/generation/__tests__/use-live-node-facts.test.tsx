// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createEditor, Editor, Transforms } from "slate";
import { Slate, withReact } from "slate-react";
import { getCanvasElements } from "@/lib/canvas/assets";
import { createCanvasElement } from "@/lib/canvas/create-canvas-element";
import { SCENE_TYPE, type ContentElement } from "@/lib/canvas/types";
import { createProjectStore, type ProjectContext } from "@/lib/project/store";
import { buildNode } from "../generation-graph";
import {
	GenerationQueueProvider,
	useGenerationQueue,
} from "../generation-queue-provider";
import { LiveGraphProvider } from "../live-graph-provider";
import type { GenerationQueue } from "../queue";
import { useLiveNodeFacts } from "../use-live-node-facts";
import { buildCtx } from "./_context";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const store = createProjectStore();
const state = store.getState();
const editor = withReact(createEditor());
const context = () => buildCtx(getCanvasElements(editor.children), { state });
vi.mock("../use-build-context", () => ({ useBuildContext: () => context }));
vi.mock("@/lib/project/use-project", async () => {
	const { useStore } = await import("zustand");
	return {
		useProject: <T,>(selector: (state: ProjectContext) => T) =>
			useStore(store, selector),
	};
});

const video = (id: string, text: string) =>
	createCanvasElement("video", { id, text });

let queue: GenerationQueue;
let facts: ReturnType<typeof useLiveNodeFacts>;
let renders = 0;
function Card({
	element,
	onRender,
}: {
	element: ContentElement;
	onRender: (
		queue: GenerationQueue,
		facts: ReturnType<typeof useLiveNodeFacts>,
	) => void;
}) {
	onRender(useGenerationQueue(), useLiveNodeFacts(element));
	return null;
}

const container = document.body.appendChild(document.createElement("div"));
let root: Root;

const mount = (element: ContentElement) =>
	act(() =>
		root.render(
			<Slate editor={editor} initialValue={editor.children}>
				<GenerationQueueProvider initialState={{}}>
					<LiveGraphProvider>
						<Card
							element={element}
							onRender={(q, v) => {
								queue = q;
								facts = v;
								renders++;
							}}
						/>
					</LiveGraphProvider>
				</GenerationQueueProvider>
			</Slate>,
		),
	);

const commit = (element: ContentElement, url: string) =>
	act(async () =>
		queue.commitResult(buildNode(element, context()), {
			videoUrl: url,
			durationSec: 5,
		}),
	);

const type = (path: number[], text: string) =>
	act(async () =>
		Transforms.insertText(editor, text, { at: Editor.end(editor, path) }),
	);

beforeEach(() => {
	root = createRoot(container);
	renders = 0;
});

afterEach(() => act(() => root.unmount()));

describe("useLiveNodeFacts", () => {
	const first = video("first", "a harbour at dawn");
	const second = video("second", "the same harbour at noon");
	beforeEach(() => {
		editor.children = [
			{ id: "scene", type: SCENE_TYPE, children: [first, second] },
		];
	});

	it("reads whether there is a prompt and why the element is stale", async () => {
		await mount(second);
		expect(facts).toEqual({ hasPrompt: true, staleReason: null });

		await commit(first, "first.mp4");
		await commit(second, "second.mp4");
		await type([0, 1], " under rain");

		expect(facts.staleReason).toBe("The prompt changed — regenerate to update");
	});

	it("re-renders for an upstream edit only when it changes what it shows", async () => {
		await mount(second);
		await commit(first, "first.mp4");
		await commit(second, "second.mp4");
		const settled = renders;

		await type([0, 0], " x");
		expect(facts.staleReason).toBe(
			"The previous visual changed — regenerate to update",
		);
		expect(renders).toBe(settled + 1);

		await type([0, 0], " y");
		expect(renders).toBe(settled + 1);
	});

	it("clears the stale reason once the chain is regenerated, without an edit", async () => {
		await mount(second);
		await commit(first, "first.mp4");
		await commit(second, "second.mp4");
		await type([0, 0], " x");
		expect(facts.staleReason).not.toBeNull();

		await commit(first, "first-v2.mp4");
		await commit(second, "second-v2.mp4");

		expect(facts).toEqual({ hasPrompt: true, staleReason: null });
	});
});
