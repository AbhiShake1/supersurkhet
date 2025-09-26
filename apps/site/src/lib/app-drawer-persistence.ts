import { gun } from "./gun";

export interface AppGroup {
	id: string;
	name: string;
	appIds: string[];
	createdAt: number;
	updatedAt: number;
}

export interface AppDrawerData {
	groups: Record<string, AppGroup>;
	settings: {
		gridColumns: number;
		iconSize: "sm" | "md" | "lg";
		viewMode: "grid" | "list" | "group";
	};
	appOrder: string[]; // Order of apps in the drawer
}

/**
 * Get the user's app drawer data from GunDB
 * @param userId The user ID to get data for
 * @returns Promise<AppDrawerData>
 */
export async function getUserAppDrawerData(
	userId: string,
): Promise<AppDrawerData | null> {
	return new Promise((resolve) => {
		if (!userId) {
			resolve(null);
			return;
		}

		gun
			.get("appDrawer")
			.get(userId)
			.once((data: AppDrawerData | null) => {
				if (!data) {
					// If no data exists, return default
					resolve({
						groups: {},
						settings: {
							gridColumns: 4,
							iconSize: "md",
							viewMode: "grid",
						},
						appOrder: [],
					});
					return;
				}
				resolve(data);
			});
	});
}

/**
 * Save the user's app drawer data to GunDB
 * @param userId The user ID to save data for
 * @param data The app drawer data to save
 * @returns Promise<void>
 */
export async function saveUserAppDrawerData(
	userId: string,
	data: AppDrawerData,
): Promise<void> {
	return new Promise((resolve) => {
		if (!userId) {
			resolve();
			return;
		}

		gun
			.get("appDrawer")
			.get(userId)
			.put(data, () => {
				resolve();
			});
	});
}

/**
 * Create a new app group
 * @param userId The user ID
 * @param groupId The group ID
 * @param name The group name
 * @param appIds The app IDs to include in the group
 * @returns Promise<void>
 */
export async function createAppGroup(
	userId: string,
	groupId: string,
	name: string,
	appIds: string[],
): Promise<void> {
	const data = await getUserAppDrawerData(userId);
	if (!data) return;

	const newGroup: AppGroup = {
		id: groupId,
		name,
		appIds,
		createdAt: Date.now(),
		updatedAt: Date.now(),
	};

	const updatedData = {
		...data,
		groups: {
			...data.groups,
			[groupId]: newGroup,
		},
	};

	await saveUserAppDrawerData(userId, updatedData);
}

/**
 * Update an existing app group
 * @param userId The user ID
 * @param groupId The group ID to update
 * @param updatedGroup Partial group data to update
 * @returns Promise<void>
 */
export async function updateAppGroup(
	userId: string,
	groupId: string,
	updatedGroup: Partial<AppGroup>,
): Promise<void> {
	const data = await getUserAppDrawerData(userId);
	if (!data || !data.groups[groupId]) return;

	const existingGroup = data.groups[groupId];
	const updatedGroupData = {
		...existingGroup,
		...updatedGroup,
		updatedAt: Date.now(),
	};

	const updatedData = {
		...data,
		groups: {
			...data.groups,
			[groupId]: updatedGroupData,
		},
	};

	await saveUserAppDrawerData(userId, updatedData);
}

/**
 * Delete an app group
 * @param userId The user ID
 * @param groupId The group ID to delete
 * @returns Promise<void>
 */
export async function deleteAppGroup(
	userId: string,
	groupId: string,
): Promise<void> {
	const data = await getUserAppDrawerData(userId);
	if (!data || !data.groups[groupId]) return;

	const updatedGroups = { ...data.groups };
	delete updatedGroups[groupId];

	const updatedData = {
		...data,
		groups: updatedGroups,
	};

	await saveUserAppDrawerData(userId, updatedData);
}

/**
 * Update app order in the drawer
 * @param userId The user ID
 * @param appOrder The new order of app IDs
 * @returns Promise<void>
 */
export async function updateAppOrder(
	userId: string,
	appOrder: string[],
): Promise<void> {
	const data = await getUserAppDrawerData(userId);
	if (!data) return;

	const updatedData = {
		...data,
		appOrder,
	};

	await saveUserAppDrawerData(userId, updatedData);
}

/**
 * Update app drawer settings
 * @param userId The user ID
 * @param settings Updated settings
 * @returns Promise<void>
 */
export async function updateAppDrawerSettings(
	userId: string,
	settings: Partial<AppDrawerData["settings"]>,
): Promise<void> {
	const data = await getUserAppDrawerData(userId);
	if (!data) return;

	const updatedData = {
		...data,
		settings: {
			...data.settings,
			...settings,
		},
	};

	await saveUserAppDrawerData(userId, updatedData);
}
