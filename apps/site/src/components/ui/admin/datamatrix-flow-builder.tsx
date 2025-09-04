"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
	Plus,
	Trash2,
	Eye,
	Wifi,
	User,
	Settings,
	ShoppingCart,
	Navigation,
	Bell,
	Database,
	GripVertical,
	Printer,
	Download,
	Copy,
	Share2,
} from "lucide-react";
import { DataMatrixCode } from "@/components/ui/datamatrix-code";
import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/lib/utils";
import { dataMatrixActionSchema, type DataMatrixAction } from "@/lib/datamatrix";
import { ActionDropdown, type ActionType } from "./action-dropdown";
import {
	Sortable,
	SortableContent,
	SortableItem,
	SortableItemHandle,
	SortableOverlay,
} from "@/components/ui/sortable";

interface ActionBlock {
	id: string;
	type: string;
	config: Record<string, unknown>;
}

export function DataMatrixFlowBuilder() {
	const [actionName, setActionName] = useState("");
	const [actionBlocks, setActionBlocks] = useState<ActionBlock[]>([]);
	const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
	const [previewAction, setPreviewAction] = useState<DataMatrixAction | null>(
		null,
	);
	const [isPreviewValid, setIsPreviewValid] = useState(true);

	// Action types with icons
	const actionTypes = [
		{ value: "wifi_connect", label: "WiFi Connection", icon: Wifi },
		{ value: "profile_enrichment", label: "Profile Enrichment", icon: User },
		{ value: "equipment_session", label: "Equipment Session", icon: Settings },
		{
			value: "restaurant_ordering",
			label: "Restaurant Ordering",
			icon: ShoppingCart,
		},
		{
			value: "product_interaction",
			label: "Product Interaction",
			icon: Database,
		},
		{ value: "navigate", label: "Navigation", icon: Navigation },
		{ value: "notification", label: "Notification", icon: Bell },
	];

	// Add a new action block
	const addActionBlock = (type: string) => {
		const newBlock: ActionBlock = {
			id: Math.random().toString(36).substring(2, 9),
			type,
			config: {},
		};
		setActionBlocks([...actionBlocks, newBlock]);
		setSelectedBlock(newBlock.id);
	};

	// Remove an action block
	const removeActionBlock = (id: string) => {
		setActionBlocks(actionBlocks.filter((block) => block.id !== id));
		if (selectedBlock === id) {
			setSelectedBlock(null);
		}
	};

	// Update block configuration
	const updateBlockConfig = (id: string, config: Record<string, unknown>) => {
		setActionBlocks(
			actionBlocks.map((block) =>
				block.id === id ? { ...block, config } : block,
			),
		);
	};

	// Generate preview action
	const generatePreviewAction = useCallback(() => {
		try {
			// Build action object from blocks
			const action: Partial<DataMatrixAction> = {
				version: "1.0",
			};

			// Process each block - we need to handle multiple actions properly
			let hasWifiAction = false;
			let hasNotificationAction = false;
			let wifiConfig: any = null;
			let notificationConfig: any = null;

			for (const block of actionBlocks) {
				switch (block.type) {
					case "wifi_connect":
						hasWifiAction = true;
						action.action = "wifi_connect";
						wifiConfig = {
							ssid: (block.config.ssid as string) || "",
							password: (block.config.password as string) || "",
							security: (block.config.security as string) || "WPA2",
						};
						action.wifi = wifiConfig;
						break;
					case "navigate":
						action.action = "navigate";
						// Handle parameters - use parsed params if available, otherwise empty object
						let navigationParams = {};
						if (block.config.params) {
							navigationParams = block.config.params as Record<string, string>;
						}
						action.navigation = {
							url: (block.config.url as string) || "",
							params: navigationParams,
						};
						break;
					case "notification":
						hasNotificationAction = true;
						notificationConfig = {
							title: (block.config.title as string) || "",
							message: (block.config.message as string) || "",
						};
						break;
					case "profile_enrichment":
						action.action = "profile_enrichment";
						action.checks = [
							{
								field: (block.config.field as string) || "",
								required: (block.config.required as boolean) || false,
							},
						];
						break;
					case "equipment_session":
						action.action = "equipment_session";
						action.equipment = {
							id: (block.config.equipmentId as string) || "",
							type: (block.config.equipmentType as string) || "",
							location: "unspecified",
						};
						action.session = {
							duration: (block.config.duration as number) || 30,
						};
						break;
					case "restaurant_ordering":
						action.action = "restaurant_ordering";
						action.restaurant = {
							id: (block.config.restaurantId as string) || "",
							table: (block.config.table as string) || "",
						};
						break;
					case "product_interaction":
						action.action = "product_interaction";
						action.product = {
							id: (block.config.productId as string) || "",
							sku: (block.config.sku as string) || "",
						};
						break;
				}
			}

			// Handle post_connect notification - this should be at the top level
			if (hasNotificationAction && notificationConfig) {
				action.post_connect = {
					notification: notificationConfig
				};
			}

			// Validate the action
			const validatedAction = dataMatrixActionSchema.parse(action);
			setPreviewAction(validatedAction);
			setIsPreviewValid(true);
		} catch (error) {
			console.error("Validation error:", error);
			setIsPreviewValid(false);
			toast.error("Invalid action configuration");
		}
	}, [actionBlocks]);

	// Generate preview when blocks change
	useEffect(() => {
		if (actionBlocks.length > 0) {
			generatePreviewAction();
		} else {
			setPreviewAction(null);
		}
	}, [actionBlocks, generatePreviewAction]);

	// Render block configuration form based on type
	const renderBlockConfig = (block: ActionBlock) => {
		switch (block.type) {
			case "wifi_connect":
				return (
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor={`ssid-${block.id}`} className="text-sm font-medium">
								WiFi Network Name (SSID)
							</Label>
							<Input
								id={`ssid-${block.id}`}
								value={block.config.ssid || ""}
								onChange={(e) =>
									updateBlockConfig(block.id, {
										...block.config,
										ssid: e.target.value,
									})
								}
								placeholder="Enter network name"
								className="text-sm"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor={`password-${block.id}`} className="text-sm font-medium">
								Password
							</Label>
							<Input
								id={`password-${block.id}`}
								type="password"
								value={block.config.password || ""}
								onChange={(e) =>
									updateBlockConfig(block.id, {
										...block.config,
										password: e.target.value,
									})
								}
								placeholder="Enter password"
								className="text-sm"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor={`security-${block.id}`} className="text-sm font-medium">
								Security Type
							</Label>
							<Select
								value={block.config.security || "WPA2"}
								onValueChange={(value) =>
									updateBlockConfig(block.id, {
										...block.config,
										security: value,
									})
								}
							>
								<SelectTrigger id={`security-${block.id}`} className="text-sm">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="WPA2">WPA2</SelectItem>
									<SelectItem value="WPA3">WPA3</SelectItem>
									<SelectItem value="WEP">WEP</SelectItem>
									<SelectItem value="open">Open Network</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				);
			case "navigate":
				return (
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor={`url-${block.id}`} className="text-sm font-medium">
								URL
							</Label>
							<Input
								id={`url-${block.id}`}
								value={block.config.url || ""}
								onChange={(e) =>
									updateBlockConfig(block.id, {
										...block.config,
										url: e.target.value,
									})
								}
								placeholder="https://example.com"
								className="text-sm"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor={`params-${block.id}`} className="text-sm font-medium">
								URL Parameters
							</Label>
							<Textarea
								id={`params-${block.id}`}
								value={block.config.paramsRaw || JSON.stringify(block.config.params || {}, null, 2)}
								onChange={(e) =>
									updateBlockConfig(block.id, {
										...block.config,
										paramsRaw: e.target.value
									})
								}
								onBlur={(e) => {
									try {
										const params = JSON.parse(e.target.value);
										updateBlockConfig(block.id, {
											...block.config,
											params,
											paramsRaw: undefined // Clear raw value after successful parse
										});
										toast.success("Parameters updated successfully");
									} catch (error) {
										toast.error("Invalid JSON in parameters");
									}
								}}
								placeholder='{"param1": "value1", "param2": "value2"}'
								rows={4}
								className="text-sm font-mono"
							/>
							<p className="text-xs text-muted-foreground">
								Enter parameters as JSON key-value pairs. Press Tab or click outside to save.
							</p>
						</div>
					</div>
				);
			case "notification":
				return (
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor={`title-${block.id}`} className="text-sm font-medium">
								Title
							</Label>
							<Input
								id={`title-${block.id}`}
								value={block.config.title || ""}
								onChange={(e) =>
									updateBlockConfig(block.id, {
										...block.config,
										title: e.target.value,
									})
								}
								placeholder="Notification title"
								className="text-sm"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor={`message-${block.id}`} className="text-sm font-medium">
								Message
							</Label>
							<Textarea
								id={`message-${block.id}`}
								value={block.config.message || ""}
								onChange={(e) =>
									updateBlockConfig(block.id, {
										...block.config,
										message: e.target.value,
									})
								}
								placeholder="Notification message"
								rows={3}
								className="text-sm"
							/>
						</div>
					</div>
				);
			case "profile_enrichment":
				return (
					<div className="space-y-4">
						<div className="space-y-2">
							<Label className="text-sm font-medium">Field Checks</Label>
							<div className="text-xs text-muted-foreground">
								Configure checks for user profile fields
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor={`field-${block.id}`} className="text-sm font-medium">
								Field Name
							</Label>
							<Input
								id={`field-${block.id}`}
								value={block.config.field || ""}
								onChange={(e) =>
									updateBlockConfig(block.id, {
										...block.config,
										field: e.target.value,
									})
								}
								placeholder="e.g., emergency_contact"
								className="text-sm"
							/>
						</div>
						<div className="flex items-center space-x-2">
							<input
								type="checkbox"
								id={`required-${block.id}`}
								checked={block.config.required === true}
								onChange={(e) =>
									updateBlockConfig(block.id, {
										...block.config,
										required: e.target.checked,
									})
								}
								className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
							/>
							<Label htmlFor={`required-${block.id}`} className="text-sm">
								Field Required
							</Label>
						</div>
					</div>
				);
			case "equipment_session":
				return (
					<div className="space-y-4">
						<div className="space-y-2">
							<Label className="text-sm font-medium">Equipment Information</Label>
							<div className="text-xs text-muted-foreground">
								Configure equipment access and session management
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor={`equipment-id-${block.id}`} className="text-sm font-medium">
								Equipment ID
							</Label>
							<Input
								id={`equipment-id-${block.id}`}
								value={block.config.equipmentId || ""}
								onChange={(e) =>
									updateBlockConfig(block.id, {
										...block.config,
										equipmentId: e.target.value,
									})
								}
								placeholder="e.g., treadmill_001"
								className="text-sm"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor={`equipment-type-${block.id}`} className="text-sm font-medium">
								Equipment Type
							</Label>
							<Input
								id={`equipment-type-${block.id}`}
								value={block.config.equipmentType || ""}
								onChange={(e) =>
									updateBlockConfig(block.id, {
										...block.config,
										equipmentType: e.target.value,
									})
								}
								placeholder="e.g., cardio"
								className="text-sm"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor={`duration-${block.id}`} className="text-sm font-medium">
								Session Duration (minutes)
							</Label>
							<Input
								id={`duration-${block.id}`}
								type="number"
								value={block.config.duration || ""}
								onChange={(e) =>
									updateBlockConfig(block.id, {
										...block.config,
										duration: parseInt(e.target.value) || 0,
									})
								}
								placeholder="30"
								className="text-sm"
							/>
						</div>
					</div>
				);
			case "restaurant_ordering":
				return (
					<div className="space-y-4">
						<div className="space-y-2">
							<Label className="text-sm font-medium">Restaurant Information</Label>
							<div className="text-xs text-muted-foreground">
								Configure restaurant ordering experience
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor={`restaurant-id-${block.id}`} className="text-sm font-medium">
								Restaurant ID
							</Label>
							<Input
								id={`restaurant-id-${block.id}`}
								value={block.config.restaurantId || ""}
								onChange={(e) =>
									updateBlockConfig(block.id, {
										...block.config,
										restaurantId: e.target.value,
									})
								}
								placeholder="e.g., anjal_restaurant"
								className="text-sm"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor={`table-${block.id}`} className="text-sm font-medium">
								Table Identifier
							</Label>
							<Input
								id={`table-${block.id}`}
								value={block.config.table || ""}
								onChange={(e) =>
									updateBlockConfig(block.id, {
										...block.config,
										table: e.target.value,
									})
								}
								placeholder="e.g., table_5 or from_context"
								className="text-sm"
							/>
						</div>
					</div>
				);
			case "product_interaction":
				return (
					<div className="space-y-4">
						<div className="space-y-2">
							<Label className="text-sm font-medium">Product Information</Label>
							<div className="text-xs text-muted-foreground">
								Configure product interaction experience
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor={`product-id-${block.id}`} className="text-sm font-medium">
								Product ID
							</Label>
							<Input
								id={`product-id-${block.id}`}
								value={block.config.productId || ""}
								onChange={(e) =>
									updateBlockConfig(block.id, {
										...block.config,
										productId: e.target.value,
									})
								}
								placeholder="e.g., smart_watch_x1"
								className="text-sm"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor={`sku-${block.id}`} className="text-sm font-medium">
								Product SKU
							</Label>
							<Input
								id={`sku-${block.id}`}
								value={block.config.sku || ""}
								onChange={(e) =>
									updateBlockConfig(block.id, {
										...block.config,
										sku: e.target.value,
									})
								}
								placeholder="e.g., SW-X1-BLK-001"
								className="text-sm"
							/>
						</div>
					</div>
				);
			default:
				return (
					<div className="text-muted-foreground py-4 text-center">
						<p className="font-medium">Configuration not yet implemented</p>
						<p className="text-sm mt-1">
							Configuration options for this action type are not yet available.
						</p>
					</div>
				);
		}
	};

	return (
		<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
			{/* Left Panel - Action Blocks */}
			<div className="lg:col-span-2 space-y-6">
				{/* Action Name */}
				<Card className="transition-all duration-300 hover:shadow-md">
					<CardHeader>
						<CardTitle>Flow Details</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="actionName" className="text-sm font-medium">
									Action Name
								</Label>
								<Input
									id="actionName"
									value={actionName}
									onChange={(e) => setActionName(e.target.value)}
									placeholder="Enter a name for this action flow"
									className="text-sm"
								/>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Flow Canvas */}
				<Card className="transition-all duration-300 hover:shadow-md">
					<CardHeader>
						<CardTitle>Flow Canvas</CardTitle>
					</CardHeader>
					<CardContent>
						{actionBlocks.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
								<Database className="h-12 w-12 mb-4 text-muted-foreground/50" />
								<p className="text-lg font-medium mb-2">No actions added yet</p>
								<p className="text-center mb-6 max-w-sm text-muted-foreground">
									Create your first action to get started with your DataMatrix flow
								</p>
								<ActionDropdown
									actionTypes={actionTypes}
									onActionSelect={addActionBlock}
									triggerText="Add First Action"
									variant="add"
								/>
							</div>
						) : (
							<Sortable
								value={actionBlocks}
								onValueChange={setActionBlocks}
								getItemValue={(item) => item.id}
							>
								<SortableContent asChild>
									<div className="space-y-4">
										{actionBlocks.map((block, index) => {
											const actionType = actionTypes.find(
												(at) => at.value === block.type,
											);
											const Icon = actionType?.icon || Database;

											return (
												<SortableItem key={block.id} value={block.id} asChild>
													<Card
														className={cn(
															"transition-all duration-200 hover:shadow-md cursor-pointer",
															selectedBlock === block.id
																? "border-primary shadow-md ring-2 ring-primary/20"
																: "border-border"
														)}
														onClick={() => setSelectedBlock(block.id)}
													>
														<CardHeader className="pb-3">
															<div className="flex items-center justify-between">
																<div className="flex items-center gap-3">
																	<SortableItemHandle asChild>
																		<Button
																			variant="ghost"
																			size="icon"
																			className="h-8 w-8 p-0 text-muted-foreground hover:bg-muted"
																		>
																			<GripVertical className="h-4 w-4" />
																		</Button>
																	</SortableItemHandle>
																	<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
																		<Icon className="h-5 w-5" />
																	</div>
																	<div>
																		<CardTitle className="text-lg">
																			{actionType?.label || block.type}
																		</CardTitle>
																		<p className="text-xs text-muted-foreground capitalize">
																			{block.type.replace("_", " ")}
																		</p>
																	</div>
																</div>
																<Button
																	variant="ghost"
																	size="sm"
																	onClick={(e) => {
																		e.stopPropagation();
																		removeActionBlock(block.id);
																	}}
																	className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
																>
																	<Trash2 className="h-4 w-4" />
																</Button>
															</div>
														</CardHeader>
														<CardContent>
															{selectedBlock === block.id && (
																<div className="pt-4 border-t border-border animate-in slide-in-from-top-2 duration-300">
																	{renderBlockConfig(block)}
																</div>
															)}
														</CardContent>
													</Card>
												</SortableItem>
											);
										})}
										<div className="pt-4 flex justify-center">
											<ActionDropdown
												actionTypes={actionTypes}
												onActionSelect={addActionBlock}
												triggerText="Add Action"
												variant="add"
											/>
										</div>
									</div>
								</SortableContent>
								<SortableOverlay>
									<div className="rounded-lg border-2 border-dashed border-primary bg-primary/10 opacity-80" />
								</SortableOverlay>
							</Sortable>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Right Panel - Preview */}
			<div className="space-y-6">
				{/* Preview Card */}
				<Card className="transition-all duration-300 hover:shadow-md">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Eye className="h-5 w-5" />
							Preview
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-6">
							<div className="flex flex-col items-center gap-4">
								{previewAction ? (
									<>
										<div className="p-4 bg-white rounded-lg shadow-sm">
											<DataMatrixCode
												value={previewAction}
												size={200}
												format="datamatrix"
											/>
										</div>
										<div className="text-center">
											<p className="text-sm text-muted-foreground">
												Scan this DataMatrix to test your action flow
											</p>
										</div>
									</>
								) : (
									<div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
										<Database className="h-12 w-12 mb-4 text-muted-foreground/50" />
										<p className="text-center max-w-xs">
											Add actions to see a preview of your DataMatrix
										</p>
									</div>
								)}
							</div>

							{previewAction && (
								<div className="flex flex-wrap justify-center gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => {
											// Print functionality
											const printWindow = window.open('', '_blank');
											if (printWindow) {
												printWindow.document.write(`
													<html>
														<head>
															<title>DataMatrix Code</title>
															<style>
																body { 
																	display: flex; 
																	justify-content: center; 
																	align-items: center; 
																	height: 100vh; 
																	margin: 0; 
																}
																img { 
																	max-width: 100%; 
																	height: auto; 
																}
															</style>
														</head>
														<body>
															<img src="${document.querySelector('canvas')?.toDataURL()}" alt="DataMatrix Code" />
														</body>
													</html>
												`);
												printWindow.document.close();
												printWindow.focus();
												printWindow.print();
											}
										}}
									>
										<Printer className="h-4 w-4 mr-2" />
										Print
									</Button>

									<Button
										variant="outline"
										size="sm"
										onClick={() => {
											// Download functionality
											const canvas = document.querySelector('canvas');
											if (canvas) {
												const link = document.createElement('a');
												link.download = 'datamatrix-code.png';
												link.href = canvas.toDataURL('image/png');
												link.click();
											}
										}}
									>
										<Download className="h-4 w-4 mr-2" />
										Download
									</Button>

									<CopyButton
										copyType="image"
										getImage={async () => {
											const canvas = document.querySelector('canvas');
											if (canvas) {
												return new Promise((resolve) => {
													canvas.toBlob((blob) => resolve(blob));
												});
											}
											return null;
										}}
										variant="outline"
										size="sm"
									/>

									<Button
										variant="outline"
										size="sm"
										onClick={() => {
											// Share functionality
											if (navigator.share) {
												const canvas = document.querySelector('canvas');
												if (canvas) {
													canvas.toBlob((blob) => {
														if (blob) {
															const file = new File([blob], 'datamatrix-code.png', { type: 'image/png' });
															navigator.share({
																title: 'DataMatrix Code',
																text: 'Scan this DataMatrix code',
																files: [file]
															}).catch(() => {
																// User cancelled or share failed
															});
														}
													});
												}
											} else {
												toast.info('Sharing is not supported on this device');
											}
										}}
									>
										<Share2 className="h-4 w-4 mr-2" />
										Share
									</Button>
								</div>
							)}

							{actionBlocks.length > 0 && (
								<div className="space-y-4 p-4 bg-muted/50 rounded-lg max-h-60 overflow-y-auto">
									<h3 className="text-sm font-medium">Configured Actions</h3>
									{actionBlocks.map((block, index) => {
										const actionType = actionTypes.find(
											(at) => at.value === block.type,
										);
										const Icon = actionType?.icon || Database;

										return (
											<div key={block.id} className="space-y-2 text-sm p-2 bg-background rounded border">
												<div className="flex items-center gap-2">
													<Icon className="h-4 w-4 text-muted-foreground" />
													<span className="font-medium capitalize">
														{actionType?.label || block.type.replace("_", " ")}
													</span>
												</div>

												{block.type === "wifi_connect" && block.config.ssid && (
													<div className="ml-6 space-y-1">
														<div className="flex justify-between">
															<span className="text-muted-foreground">Network:</span>
															<span>{block.config.ssid as string}</span>
														</div>
														{block.config.security && (
															<div className="flex justify-between">
																<span className="text-muted-foreground">Security:</span>
																<span>{block.config.security as string}</span>
															</div>
														)}
													</div>
												)}

												{block.type === "navigate" && block.config.url && (
													<div className="ml-6 space-y-1">
														<div className="flex justify-between">
															<span className="text-muted-foreground">URL:</span>
															<span className="truncate max-w-[120px]">{block.config.url as string}</span>
														</div>
														{block.config.params && Object.keys(block.config.params).length > 0 && (
															<div>
																<span className="text-muted-foreground">Params:</span>
																<div className="ml-2 text-xs">
																	{Object.entries(block.config.params).map(([key, value]) => (
																		<div key={key} className="flex justify-between">
																			<span>{key}:</span>
																			<span>{String(value)}</span>
																		</div>
																	))}
																</div>
															</div>
														)}
													</div>
												)}

												{block.type === "notification" && block.config.title && (
													<div className="ml-6 space-y-1">
														<div className="flex justify-between">
															<span className="text-muted-foreground">Title:</span>
															<span>{block.config.title as string}</span>
														</div>
														{block.config.message && (
															<div className="text-muted-foreground text-xs">
																{block.config.message as string}
															</div>
														)}
													</div>
												)}

												{block.type === "restaurant_ordering" && (block.config.restaurantId || block.config.table) && (
													<div className="ml-6 space-y-1">
														{block.config.restaurantId && (
															<div className="flex justify-between">
																<span className="text-muted-foreground">Restaurant:</span>
																<span>{block.config.restaurantId as string}</span>
															</div>
														)}
														{block.config.table && (
															<div className="flex justify-between">
																<span className="text-muted-foreground">Table:</span>
																<span>{block.config.table as string}</span>
															</div>
														)}
													</div>
												)}

												{block.type === "equipment_session" && (block.config.equipmentId || block.config.equipmentType) && (
													<div className="ml-6 space-y-1">
														{block.config.equipmentId && (
															<div className="flex justify-between">
																<span className="text-muted-foreground">Equipment:</span>
																<span>{block.config.equipmentId as string}</span>
															</div>
														)}
														{block.config.equipmentType && (
															<div className="flex justify-between">
																<span className="text-muted-foreground">Type:</span>
																<span>{block.config.equipmentType as string}</span>
															</div>
														)}
														{block.config.duration && (
															<div className="flex justify-between">
																<span className="text-muted-foreground">Duration:</span>
																<span>{block.config.duration as number} min</span>
															</div>
														)}
													</div>
												)}

												{block.type === "product_interaction" && (block.config.productId || block.config.sku) && (
													<div className="ml-6 space-y-1">
														{block.config.productId && (
															<div className="flex justify-between">
																<span className="text-muted-foreground">Product:</span>
																<span>{block.config.productId as string}</span>
															</div>
														)}
														{block.config.sku && (
															<div className="flex justify-between">
																<span className="text-muted-foreground">SKU:</span>
																<span>{block.config.sku as string}</span>
															</div>
														)}
													</div>
												)}

												{block.type === "profile_enrichment" && block.config.field && (
													<div className="ml-6 space-y-1">
														<div className="flex justify-between">
															<span className="text-muted-foreground">Field:</span>
															<span>{block.config.field as string}</span>
														</div>
														{block.config.required !== undefined && (
															<div className="flex justify-between">
																<span className="text-muted-foreground">Required:</span>
																<span>{block.config.required ? "Yes" : "No"}</span>
															</div>
														)}
													</div>
												)}
											</div>
										);
									})}
								</div>
							)}
						</div>
					</CardContent>
				</Card>

				{/* Export Options */}
				<Card className="transition-all duration-300 hover:shadow-md">
					<CardHeader>
						<CardTitle>Export Options</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							<div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
								<div>
									<p className="font-medium text-sm">DataMatrix Format</p>
									<p className="text-xs text-muted-foreground">
										Optimized for small physical codes
									</p>
								</div>
								<Switch defaultChecked />
							</div>

							<div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
								<div>
									<p className="font-medium text-sm">QR Code Format</p>
									<p className="text-xs text-muted-foreground">
										For larger payloads and compatibility
									</p>
								</div>
								<Switch />
							</div>

							<div className="pt-2">
								<Button
									className="w-full"
									disabled={!previewAction || !isPreviewValid}
								>
									Save Action Flow
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}