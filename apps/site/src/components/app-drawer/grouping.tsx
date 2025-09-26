import {
	DndContext,
	type DragEndEvent,
	type DragOverEvent,
	type DragStartEvent,
	DragOverlay,
	MouseSensor,
	TouchSensor,
	useSensor,
	useSensors,
	closestCorners,
	KeyboardSensor,
	type UniqueIdentifier,
} from "@dnd-kit/core";
import {
	SortableContext,
	arrayMove,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useState, useMemo, useEffect } from "react";
import { Button } from "../ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Link } from "@tanstack/react-router";
import { Folder, ImageOff, GripVertical } from "lucide-react";
import { AppSortableItem } from "./app-sortable-item";
import type { Business } from "@/lib/schema";
import { gun } from "@/lib/gun";
import {
	getUserAppDrawerData,
	createAppGroup,
	updateAppOrder,
	type AppDrawerData,
} from "@/lib/app-drawer-persistence";

interface AppGroupingProps {
	businesses: Business[];
	gridColumns: number;
	iconSize: "sm" | "md" | "lg";
	onBusinessesChange: (businesses: Business[]) => void;
}

export interface AppItem {
	id: string;
	business: Business;
	type: "app" | "folder";
	folderContents?: Business[];
}

export interface AppFolder {
	id: string;
	name: string;
	apps: Business[];
}

export function AppGrouping({
	businesses,
	gridColumns,
	iconSize,
	onBusinessesChange,
}: AppGroupingProps) {
	const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
	const [groups, setGroups] = useState<Record<string, string[]>>({});
	const [folders, setFolders] = useState<Record<string, AppFolder>>({});
	const [userId, setUserId] = useState<string | null>(null);

	// Get user ID from GunDB
	useEffect(() => {
		const user = gun.user();
		if (user && user.is && user.is.pub) {
			setUserId(user.is.pub);
		} else {
			// If not logged in, use a fallback ID based on session
			setUserId("anonymous");
		}
	}, []);

	// Load persisted data when component mounts
	useEffect(() => {
		const loadPersistedData = async () => {
			if (!userId) return;

			const data = await getUserAppDrawerData(userId);
			if (data) {
				// Set up folders based on persisted groups
				const newFolders: Record<string, AppFolder> = {};
				Object.values(data.groups).forEach((group) => {
					// Find businesses based on IDs in the group
					const groupBusinesses = businesses.filter((business) =>
						group.appIds.includes(business._?.soul || business.name),
					);

					newFolders[group.id] = {
						id: group.id,
						name: group.name,
						apps: groupBusinesses,
					};
				});

				setFolders(newFolders);
			}
		};

		loadPersistedData();
	}, [userId, businesses]);

	// Prepare items for DnD
	const items = useMemo(() => {
		const allItems: AppItem[] = [];

		businesses.forEach((business) => {
			allItems.push({
				id: business._?.soul || business.name,
				business,
				type: "app",
			});
		});

		// Add folder items
		Object.values(folders).forEach((folder) => {
			allItems.push({
				id: folder.id,
				business: {} as Business, // Placeholder
				type: "folder",
				folderContents: folder.apps,
			});
		});

		return allItems;
	}, [businesses, folders]);

	// Sensors for different input methods
	const sensors = useSensors(
		useSensor(MouseSensor, {
			activationConstraint: {
				distance: 5,
			},
		}),
		useSensor(TouchSensor),
		useSensor(KeyboardSensor),
	);

	// Find the item being dragged
	const activeItem = useMemo(() => {
		if (!activeId) return null;
		return items.find((item) => item.id === activeId);
	}, [activeId, items]);

	// Handle drag start
	const handleDragStart = (event: DragStartEvent) => {
		setActiveId(event.active.id);
	};

	// Handle drag over
	const handleDragOver = (event: DragOverEvent) => {
		const { active, over } = event;

		if (!over) return;

		// Check if we're dragging over a folder
		if (over.id in folders) {
			// If dragging an app over a folder, add it to the folder
			if (active.data.current?.business) {
				setFolders((prev) => {
					const newFolders = { ...prev };
					const folderId = over.id as string;

					if (
						active.data.current?.business &&
						!newFolders[folderId].apps.some((app) => app._?.soul === active.id)
					) {
						newFolders[folderId] = {
							...newFolders[folderId],
							apps: [
								...newFolders[folderId].apps,
								active.data.current.business,
							],
						};

						// Persist changes to GunDB
						if (userId) {
							const appIds = newFolders[folderId].apps.map(
								(app) => app._?.soul || app.name,
							);
							createAppGroup(userId, folderId, folderId, appIds);
						}
					}

					return newFolders;
				});
			}
		} else if (active.data.current?.business && active.id !== over.id) {
			// Check if we're dragging an app over another app to create a new group
			const overItem = items.find((item) => item.id === over.id);
			if (overItem && overItem.type === "app") {
				// Create a new group with both apps
				const newFolderId = `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
				const newFolderName = active.data.current?.business
					? `${active.data.current.business.name} Group`
					: "New Group";

				setFolders((prev) => {
					const newFolders = {
						...prev,
						[newFolderId]: {
							id: newFolderId,
							name: newFolderName,
							apps: [
								over.data.current?.business,
								active.data.current?.business,
							].filter(Boolean) as Business[],
						},
					};

					// Persist the new group to GunDB
					if (
						userId &&
						active.data.current?.business &&
						over.data.current?.business
					) {
						const appIds = newFolders[newFolderId].apps.map(
							(app) => app._?.soul || app.name,
						);
						createAppGroup(userId, newFolderId, newFolderName, appIds);
					}

					return newFolders;
				});
			}
		}
	};

	// Handle drag end
	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;

		if (!over) {
			setActiveId(null);
			return;
		}

		// If dropping on a folder, we already handled it in drag over
		if (over.id in folders) {
			setActiveId(null);
			return;
		}

		// If we're trying to reorder apps
		if (active.id !== over.id) {
			// Find the current item index
			const currentItems = items.map((item) => item.id);
			const oldIndex = currentItems.indexOf(active.id as string);
			const newIndex = currentItems.indexOf(over.id as string);

			if (oldIndex !== -1 && newIndex !== -1) {
				const newItems = arrayMove(items, oldIndex, newIndex);

				// Extract businesses from reordered items
				const orderedBusinesses = newItems
					.filter((item) => item.type === "app")
					.map((item) => item.business);

				onBusinessesChange(orderedBusinesses);

				// Update the order in GunDB
				if (userId) {
					const appIds = orderedBusinesses.map(
						(business) => business._?.soul || business.name,
					);
					updateAppOrder(userId, appIds);
				}
			}
		}

		setActiveId(null);
	};

	// Size classes mapping
	const iconSizeClasses = {
		sm: "w-10 h-10",
		md: "w-12 h-12",
		lg: "w-16 h-16",
	};

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCorners}
			onDragStart={handleDragStart}
			onDragOver={handleDragOver}
			onDragEnd={handleDragEnd}
		>
			<SortableContext
				items={items.map((item) => item.id)}
				strategy={verticalListSortingStrategy}
			>
				<div className={`grid grid-cols-${gridColumns} gap-4`}>
					{items.map((item) => {
						if (item.type === "folder") {
							return (
								<Card key={item.id} className="relative flex flex-col">
									<CardHeader className="pb-2">
										<div className="flex items-center gap-2">
											<GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
											<Folder className="h-8 w-8 text-muted-foreground" />
										</div>
										<CardTitle className="flex items-center gap-2">
											<Folder className="h-4 w-4" />
											{item.id}
										</CardTitle>
										<CardDescription>
											{item.folderContents?.length || 0} apps
										</CardDescription>
									</CardHeader>
									<CardContent className="flex-grow flex flex-col justify-end pt-0">
										<Button asChild>
											<Link
												to="/apps"
												onClick={(e) => {
													e.preventDefault();
													// In a real implementation, this would navigate to a folder page
													console.log("Opening folder:", item.id);
												}}
											>
												Open Folder
											</Link>
										</Button>
									</CardContent>
								</Card>
							);
						} else {
							// Regular app item
							const business = item.business;
							return (
								<AppSortableItem
									key={item.id}
									id={item.id}
									business={business}
									iconSize={iconSize}
									iconSizeClasses={iconSizeClasses}
								/>
							);
						}
					})}
				</div>
			</SortableContext>
			<DragOverlay>
				{activeItem ? (
					<Card className="w-48 opacity-80">
						<CardHeader className="pb-2">
							<CardTitle className="text-sm truncate">
								{activeItem.business?.name}
							</CardTitle>
							<Badge
								variant="secondary"
								className="capitalize text-xs px-2 py-1 rounded-full self-start"
							>
								{activeItem.business?.businessType.replace(/_/g, " ")}
							</Badge>
						</CardHeader>
					</Card>
				) : null}
			</DragOverlay>
		</DndContext>
	);
}
