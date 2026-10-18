import { dedent } from "@/lib/dedent";
import { z } from "zod";
import { InsertElement } from "@/components/ui/icon";
import { groupFor } from "@/lib/connectors/model-groups";
import { modelEntry, modelRefSchema } from "@/lib/connectors/models";
import { CONNECTOR_TYPES } from "@/lib/connectors/types";
import { defineTool } from "./define-tool";
import { requireConnected } from "./require-connected";

export const setDefaultModel = defineTool({
	description: dedent`
	  Set the model the project gives new elements of a type, from list_models. Elements
	  already on the canvas keep theirs; move them with set_element_model.
	`,
	input: modelRefSchema.extend({ type: z.enum(CONNECTOR_TYPES) }),
	output: z.string(),
	icon: InsertElement,
	label: ({ model }) =>
		`Setting the default model${model ? ` to ${model}` : ""}`,
	execute: async ({ type, ...model }, ctx) => {
		modelEntry(type, model);
		requireConnected(model.provider, ctx);
		const { label, types } = groupFor(type);
		ctx.updateModels(Object.fromEntries(types.map((each) => [each, model])));
		return `New ${label.toLowerCase()} elements now get ${model.model} from ${model.provider}.`;
	},
});
