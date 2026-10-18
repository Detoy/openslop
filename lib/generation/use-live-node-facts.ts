"use client";

import { useCallback } from "react";
import { useSlateSelector } from "slate-react";
import { shallow } from "zustand/shallow";
import type { GeneratedElement } from "@/lib/canvas/types";
import {
	useGenerationQueue,
	useQueueSelector,
} from "./generation-queue-provider";
import { hasPrompt } from "./graph";
import { useResolveNode } from "./live-graph-provider";
import { staleReason } from "./stale-reason";

type LiveNodeFacts = { hasPrompt: boolean; staleReason: string | null };

/** What a card shows of its node: an upstream edit that leaves these alone does not re-render it. */
export function useLiveNodeFacts(element: GeneratedElement): LiveNodeFacts {
	const queue = useGenerationQueue();
	const resolve = useResolveNode();
	const read = useCallback(() => {
		const node = resolve(element);
		return {
			hasPrompt: hasPrompt(node),
			staleReason: staleReason(node, queue),
		};
	}, [resolve, element, queue]);
	// An edit re-reads both; a held result changing re-reads the reason, so it is taken from there.
	const { hasPrompt: promptGiven } = useSlateSelector(read, shallow);
	const reason = useQueueSelector((q) => staleReason(resolve(element), q));
	return { hasPrompt: promptGiven, staleReason: reason };
}
