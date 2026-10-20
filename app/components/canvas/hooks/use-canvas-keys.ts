"use client";

import type { KeyboardEvent } from "react";
import { Editor, Transforms } from "slate";
import { ReactEditor, useSlateStatic } from "slate-react";
import { isContentElement } from "@/lib/canvas/guards";
import type { ContentElement } from "@/lib/canvas/types";

const FOOTER = "[data-element-actions]";

const usable = (button: HTMLButtonElement) =>
	!button.disabled && button.getAttribute("aria-disabled") !== "true";

/** A footer's usable controls, in Tab order; Generate comes last. */
const controlsOf = (footer: Element) =>
	Array.from(footer.querySelectorAll("button")).filter(usable);

const elementOf = (editor: Editor, footer: Element) => {
	const element = ReactEditor.toSlateNode(editor, footer);
	return isContentElement(element) ? element : undefined;
};

/** The card after this footer's; a collapsed scene's elements render without a footer and are passed over. */
const nextElement = (editor: Editor, footer: Element) => {
	const footers = Array.from(
		ReactEditor.toDOMNode(editor, editor).querySelectorAll(FOOTER),
	);
	const next = footers[footers.indexOf(footer) + 1];
	return next && elementOf(editor, next);
};

const focusButton = (button: HTMLButtonElement | undefined) => {
	button?.focus();
	return button !== undefined;
};

/** Puts the caret at the end of an element's prompt. The DOM focus moves by hand: Slate counts a focused footer button as its own focus. */
const selectPrompt = (editor: Editor, element: ContentElement | undefined) => {
	if (!element) return false;
	ReactEditor.toDOMNode(editor, editor).focus({ preventScroll: true });
	Transforms.select(
		editor,
		Editor.end(editor, ReactEditor.findPath(editor, element)),
	);
	return true;
};

/** A key pressed in a card's prompt, or on one of the card's footer controls. */
type Spot = {
	element: ContentElement;
	footer: Element;
	button?: HTMLButtonElement;
};

function spotOf(editor: Editor, target: EventTarget | null): Spot | undefined {
	if (!(target instanceof HTMLElement)) return undefined;
	if (target === ReactEditor.toDOMNode(editor, editor)) {
		const prompt = Editor.above(editor, { match: isContentElement });
		const footer =
			prompt && ReactEditor.toDOMNode(editor, prompt[0]).querySelector(FOOTER);
		return prompt && footer ? { element: prompt[0], footer } : undefined;
	}
	const footer = target.closest(FOOTER);
	const element = footer && elementOf(editor, footer);
	return footer && element && target instanceof HTMLButtonElement
		? { element, footer, button: target }
		: undefined;
}

/** Tab walks prompt, footer, next prompt. A command says whether it took the key; otherwise the browser's Tab stands. */
const KEYS: Partial<Record<string, (editor: Editor, spot: Spot) => boolean>> = {
	Tab: (editor, { footer, button }) =>
		button
			? button === controlsOf(footer).at(-1) &&
				selectPrompt(editor, nextElement(editor, footer))
			: focusButton(controlsOf(footer).at(-1)),
	"Shift+Tab": (editor, { element, footer, button }) =>
		button !== undefined &&
		button === controlsOf(footer)[0] &&
		selectPrompt(editor, element),
};

const keyOf = (event: KeyboardEvent) =>
	[
		event.metaKey || event.ctrlKey ? "Mod" : "",
		event.altKey ? "Alt" : "",
		event.shiftKey ? "Shift" : "",
		event.key,
	]
		.filter(Boolean)
		.join("+");

/** Keyboard paths between a card's prompt and its footer, for the element wrapping the canvas's editable. */
export function useCanvasKeys() {
	const editor = useSlateStatic();
	return (event: KeyboardEvent) => {
		if (event.defaultPrevented) return;
		const command = KEYS[keyOf(event)];
		const spot = command && spotOf(editor, event.target);
		if (spot && command(editor, spot)) event.preventDefault();
	};
}
