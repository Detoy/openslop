import compact from "lodash/compact";
import { dedent } from "@/lib/dedent";
import { z } from "zod";
import { InsertElement } from "@/components/ui/icon";
import { MODEL_GROUPS } from "@/lib/connectors/model-groups";
import {
	defaultModelFor,
	listModels as catalogModels,
	modelSourceFor,
	type ModelDefaults,
} from "@/lib/connectors/models";
import type {
	ConnectorType,
	ModelEntry,
	ModelRef,
} from "@/lib/connectors/types";
import type { AgentToolContext } from "./context";
import { defineTool } from "./define-tool";

const modelLine = (
	{ provider, model, cost, speed, description }: ModelRef & ModelEntry,
	connected: boolean,
) =>
	`- ${compact([
		`${model} from ${provider}`,
		connected ? `cost ${cost}, speed ${speed}` : "not connected",
		description,
	]).join(". ")}`;

const groupSection = (
	{ label, types: [type] }: { label: string; types: ConnectorType[] },
	chain: ModelDefaults,
	ctx: AgentToolContext,
) => {
	const fallback = defaultModelFor(type, chain);
	return [
		`${label} (type ${type}). New elements get ${fallback.model} from ${fallback.provider}, the ${modelSourceFor(type, fallback, chain)} default.`,
		...catalogModels(type).map((entry) =>
			modelLine(entry, ctx.isConnected(entry.provider)),
		),
	].join("\n");
};

export const listModels = defineTool({
	description: dedent`
	  List the models each kind of element generates with: each model's provider, its cost
	  and speed against the others of its type, what it does best, and whether the user has
	  connected its provider. Also the model new elements of each type get.
	`,
	input: z.object({}),
	output: z.string(),
	icon: InsertElement,
	label: "Reading the models",
	execute: async (_, ctx) => {
		const chain = ctx.modelChain();
		return MODEL_GROUPS.map((group) => groupSection(group, chain, ctx)).join(
			"\n\n",
		);
	},
});
