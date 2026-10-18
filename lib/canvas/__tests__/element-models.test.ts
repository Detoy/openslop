import { describe, expect, it } from "vitest";
import { withHistory } from "slate-history";
import { createCanvasElement } from "../create-canvas-element";
import { findElementById } from "../editor-ops";
import { setElementModels } from "../element-models";
import type { ContentElement } from "../types";
import { makeEditor } from "./_assets";

const SEEDANCE = { provider: "openslop", model: "Slop Video v1" } as const;

const video = (id: string): ContentElement =>
	createCanvasElement("video", { id, text: "a cat" });

const canvas = () =>
	withHistory(
		makeEditor([
			{
				id: "s1",
				type: "scene",
				children: [
					video("v1"),
					video("v2"),
					createCanvasElement("narration", { id: "n1", text: "hi" }),
				],
			},
		]),
	);

const modelOf = (editor: ReturnType<typeof canvas>, id: string) => {
	const attrs = findElementById(editor, id)?.[0].generationAttributes;
	return { provider: attrs?.provider, model: attrs?.model };
};

describe("setElementModels", () => {
	it("moves every element onto the model in one undoable step", () => {
		const editor = canvas();
		const before = modelOf(editor, "v1");

		setElementModels(editor, ["v1", "v2"], SEEDANCE);

		expect(modelOf(editor, "v1")).toEqual(SEEDANCE);
		expect(modelOf(editor, "v2")).toEqual(SEEDANCE);
		editor.undo();
		expect(modelOf(editor, "v1")).toEqual(before);
		expect(modelOf(editor, "v2")).toEqual(before);
	});

	it.each([
		[["v1", "n1"], SEEDANCE, /narration element does not pick its own model/],
		[["v1", "gone"], SEEDANCE, /"gone" is not on the canvas/],
		[
			["v1"],
			{ provider: "openslop", model: "Slop Image v1" },
			/"openslop" has no video model "Slop Image v1"/,
		],
	] as const)(
		"changes nothing when any element cannot take the model",
		(ids, model, error) => {
			const editor = canvas();
			const before = JSON.stringify(editor.children);

			expect(() => setElementModels(editor, ids, model)).toThrow(error);
			expect(JSON.stringify(editor.children)).toBe(before);
		},
	);
});
