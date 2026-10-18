import isEqual from "lodash/isEqual";
import PQueue from "p-queue";
import { createEmitter } from "@/lib/store/emitter";
import { saveProject, type SaveProjectInput } from "./api";
import type { ProjectDocument } from "./project-document";

export const AUTOSAVE_DEBOUNCE_MS = 2000;
export const AUTOSAVE_RETRY_CAP_MS = 30_000;

export interface AutosaverOptions {
	projectId: string;
	/**
	 * Read once at construction for the baseline and then when the debounce
	 * fires, so serializing stays off the per-keystroke path.
	 */
	document: Pick<ProjectDocument, "read" | "meta">;
	onSaved: () => void;
	onError: (error: unknown) => void;
}

export interface Autosaver {
	/** Coalesce this change with any others into one debounced save. */
	schedule: () => void;
	/** Run any waiting save immediately. */
	flush: () => void;
	/** Persist any pending edit, then hold every later save until {@link resume}. */
	suspend: () => void;
	/** Resume saving, with one save for whatever was dropped while suspended. */
	resume: () => void;
	onProjectSaved: (listener: (input: SaveProjectInput) => void) => () => void;
}

/**
 * Debounces edits into one save at a time. The queue keeps a slow save from
 * overlapping the next one, so the last scheduled state always lands last.
 *
 * The document it is built from counts as saved, and a save whose payload
 * matches the last one is dropped, so an untouched project never saves itself
 * on open or reports "Saved" for an echo of what it loaded.
 *
 * A failed save is reported and tried again on a doubling delay, so a blip on
 * the last save before the tab closes does not lose the edits behind it.
 */
export function createAutosaver({
	projectId,
	document,
	onSaved,
	onError,
}: AutosaverOptions): Autosaver {
	const queue = new PQueue({ concurrency: 1 });
	const projectSaved = createEmitter<SaveProjectInput>();

	const buildInput = (): SaveProjectInput => ({
		...document.read(),
		...document.meta(),
	});

	let lastSaved = buildInput();
	let suspended = false;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let retryDelay = AUTOSAVE_DEBOUNCE_MS;

	const wait = (ms: number) => {
		clearTimeout(timer);
		timer = setTimeout(save, ms);
	};

	const persist = async (input: SaveProjectInput) => {
		if (isEqual(input, lastSaved)) return;
		try {
			await saveProject(projectId, input);
			lastSaved = input;
			retryDelay = AUTOSAVE_DEBOUNCE_MS;
			onSaved();
			projectSaved.notify(input);
		} catch (error) {
			console.error("Autosave failed", error);
			if (timer === undefined && !suspended) wait(retryDelay);
			retryDelay = Math.min(retryDelay * 2, AUTOSAVE_RETRY_CAP_MS);
			onError(error);
		}
	};

	/**
	 * Reads the payload as the timer fires, not as the save runs, so a save
	 * queued behind a slow one still writes the state it was scheduled for.
	 */
	const save = () => {
		clearTimeout(timer);
		timer = undefined;
		if (suspended) return;
		const input = buildInput();
		queue.clear();
		void queue.add(() => persist(input));
	};

	const flush = () => {
		if (timer !== undefined) save();
	};

	return {
		schedule: () => wait(AUTOSAVE_DEBOUNCE_MS),
		flush,
		suspend: () => {
			flush();
			suspended = true;
		},
		resume: () => {
			suspended = false;
			wait(AUTOSAVE_DEBOUNCE_MS);
		},
		onProjectSaved: projectSaved.subscribe,
	};
}
