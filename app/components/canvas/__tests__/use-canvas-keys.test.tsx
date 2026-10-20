// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createEditor, Editor, Transforms } from "slate";
import { Editable, withReact, type RenderElementProps } from "slate-react";
import { asset } from "@/lib/canvas/__tests__/_assets";
import { findElementById } from "@/lib/canvas/editor-ops";
import { isCharacterRef, isContentElement } from "@/lib/canvas/guards";
import { getElementBodyText } from "@/lib/canvas/osml-serializer";
import type { CanvasEditor } from "@/lib/canvas/types";
import { withCharacterRefs } from "../plugins/with-character-refs";
import { useCanvasKeys } from "../hooks/use-canvas-keys";
import { useCharacterMention } from "../hooks/use-character-mention";
import { mountOnCanvas } from "./_mount";
import { content, scene } from "./fixtures";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let withoutGenerate = new Set<string>();
let compact = new Set<string>();

function Card({ attributes, element, children }: RenderElementProps) {
	if (isCharacterRef(element))
		return (
			<span {...attributes} contentEditable={false}>
				@{element.name}
				{children}
			</span>
		);
	if (!isContentElement(element)) return <div {...attributes}>{children}</div>;
	return (
		<div {...attributes}>
			<div>{children}</div>
			{!compact.has(element.id) && (
				<div data-element-actions contentEditable={false}>
					<button type="button" data-action={`${element.id}-upload`}>
						Upload
					</button>
					<button
						type="button"
						data-action={`${element.id}-generate`}
						disabled={withoutGenerate.has(element.id)}
					>
						Generate
					</button>
				</div>
			)}
		</div>
	);
}

function Harness() {
	const onCanvasKeyDown = useCanvasKeys();
	const { onKeyDown } = useCharacterMention();
	return (
		<div onKeyDown={onCanvasKeyDown}>
			<Editable renderElement={Card} onKeyDown={onKeyDown} />
		</div>
	);
}

const script = [
	asset("asset_avatar", { name: "Red" }),
	scene(
		[content("image", "img", "a sunset"), content("narration", "nar", "then")],
		"s1",
	),
	scene([content("video", "vid", "a pan")], "s2"),
];

let canvas: ReturnType<typeof mountOnCanvas> | undefined;
let editor: CanvasEditor;

/** Slate memoizes each card, so a card's shape is fixed before it mounts. */
function mount(cards: { withoutGenerate?: string[]; compact?: string[] } = {}) {
	canvas?.unmount();
	withoutGenerate = new Set(cards.withoutGenerate);
	compact = new Set(cards.compact);
	canvas = mountOnCanvas(script, withCharacterRefs(withReact(createEditor())));
	editor = canvas.editor;
	canvas.render(<Harness />);
}

afterEach(() => {
	canvas?.unmount();
	canvas = undefined;
	vi.clearAllMocks();
});

const find = (selector: string) => {
	const node = document.body.querySelector<HTMLElement>(selector);
	if (!node) throw new Error(`nothing matches ${selector}`);
	return node;
};

const editable = () => find("[data-slate-editor]");
const action = (name: string) => find(`[data-action="${name}"]`);

const elementById = (id: string) => {
	const entry = findElementById(editor, id);
	if (!entry) throw new Error(`no element ${id}`);
	return entry;
};

/** Puts the caret at the end of an element's prompt, as typing there would. */
const caretIn = (id: string) =>
	act(async () => {
		editable().focus();
		Transforms.select(editor, Editor.end(editor, elementById(id)[1]));
	});

const press = async (
	target: HTMLElement,
	key: string,
	init: KeyboardEventInit = {},
) => {
	const event = new KeyboardEvent("keydown", {
		key,
		bubbles: true,
		cancelable: true,
		...init,
	});
	await act(async () => {
		target.dispatchEvent(event);
	});
	return event.defaultPrevented;
};

const caretElementId = () =>
	Editor.above(editor, { match: isContentElement })?.[0].id;

describe("useCanvasKeys", () => {
	it("Tab from a prompt focuses that card's Generate button", async () => {
		mount();
		await caretIn("img");
		expect(await press(editable(), "Tab")).toBe(true);
		expect(document.activeElement).toBe(action("img-generate"));
	});

	it("Shift+Tab from the footer's first control puts the caret back at the end of the prompt", async () => {
		mount();
		await caretIn("img");
		await press(editable(), "Tab");
		expect(await press(action("img-generate"), "Tab", { shiftKey: true })).toBe(
			false,
		);
		expect(await press(action("img-upload"), "Tab", { shiftKey: true })).toBe(
			true,
		);
		expect(document.activeElement).toBe(editable());
		expect(editor.selection).toEqual({
			anchor: { path: [1, 0, 0], offset: "a sunset".length },
			focus: { path: [1, 0, 0], offset: "a sunset".length },
		});
	});

	it("Tab from Generate moves on to the next card's prompt, across scenes", async () => {
		mount();
		await caretIn("nar");
		await press(editable(), "Tab");
		expect(await press(action("nar-generate"), "Tab")).toBe(true);
		expect(document.activeElement).toBe(editable());
		expect(caretElementId()).toBe("vid");
	});

	it("leaves the browser's Tab alone from the last card and from a control that is not the last", async () => {
		mount();
		await caretIn("vid");
		await press(editable(), "Tab");
		expect(await press(action("vid-generate"), "Tab")).toBe(false);
		expect(await press(action("img-upload"), "Tab")).toBe(false);
	});

	it("skips a disabled Generate for the last usable control, and gives up when there is none", async () => {
		mount({ withoutGenerate: ["img"] });
		await caretIn("img");
		expect(await press(editable(), "Tab")).toBe(true);
		expect(document.activeElement).toBe(action("img-upload"));
		expect(await press(action("img-upload"), "Tab")).toBe(true);
		expect(caretElementId()).toBe("nar");

		action("img-upload").setAttribute("aria-disabled", "true");
		await caretIn("img");
		expect(await press(editable(), "Tab")).toBe(false);
		expect(document.activeElement).toBe(editable());
	});

	it("passes over a collapsed scene's elements, which have no card to land in", async () => {
		mount({ compact: ["nar"] });
		await caretIn("img");
		await press(editable(), "Tab");
		await press(action("img-generate"), "Tab");
		expect(caretElementId()).toBe("vid");
	});

	it("lets the mention menu take Tab first", async () => {
		mount();
		await caretIn("img");
		await act(async () => {
			Transforms.insertText(editor, " @R");
		});
		expect(await press(editable(), "Tab")).toBe(true);
		expect(document.activeElement).toBe(editable());
		expect(getElementBodyText(elementById("img")[0])).toBe("a sunset {{Red}}");
	});
});
