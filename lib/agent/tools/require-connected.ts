import { PROVIDER_CATALOG } from "@/lib/connectors/provider-catalog";
import type { Provider } from "@/lib/connectors/types";
import type { AgentToolContext } from "./context";

export function requireConnected(
	provider: Provider,
	ctx: AgentToolContext,
): void {
	if (!ctx.isConnected(provider))
		throw new Error(
			`The user has not connected ${PROVIDER_CATALOG[provider].name}. They can add its key under Configure models.`,
		);
}
