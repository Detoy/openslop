export const RUNWARE_IMAGE_MODELS = {
	"Muse Image": {
		id: "meta:muse@image",
		cost: "low",
		speed: "high",
		frames: [
			{ width: 1600, height: 1600 },
			{ width: 1920, height: 1280 },
			{ width: 1280, height: 1920 },
			{ width: 1792, height: 1344 },
			{ width: 1344, height: 1792 },
			{ width: 2048, height: 1152 },
			{ width: 1152, height: 2048 },
			{ width: 2352, height: 1008 },
		],
	},
	"Seedream 5 Lite": {
		id: "bytedance:seedream@5.0-lite",
		cost: "low",
		speed: "high",
	},
} as const;
