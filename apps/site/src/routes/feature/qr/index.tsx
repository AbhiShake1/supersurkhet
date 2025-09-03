import { ActionExecutor } from "@/lib/datamatrix/action-executor";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { DataMatrixCode } from "@/components/ui/datamatrix-code";
import { DataMatrixFlowBuilder } from "@/components/ui/admin/datamatrix-flow-builder";
import { DataMatrixScanner } from "@/components/ui/datamatrix-scanner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createFileRoute } from "@tanstack/react-router";
import { Code, Database, Lightbulb, QrCode, Zap } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import {
	dataMatrixActionSchema,
	type DataMatrixAction,
} from "@/lib/datamatrix";

export const Route = createFileRoute("/feature/qr/")({
	component: FeatureQrRoute,
});

function FeatureQrRoute() {
	const [sampleAction] = useState<DataMatrixAction>(() => {
		return dataMatrixActionSchema.parse({
			version: "1.0",
			action: "wifi_connect",
			wifi: {
				ssid: "SuperSurkhet-Guest",
				password: "Welcome@2025",
				security: "WPA2",
			},
			post_connect: {
				notification: {
					title: "Welcome to SuperSurkhet!",
					message:
						"You're now connected to our guest network. Explore our digital services.",
				},
			},
		});
	});

	const handleActionDetected = (action: DataMatrixAction) => {
		// Execute the action progressively
		const executor = new ActionExecutor(action);

		executor.onProgress((state) => {
			console.log("Action progress:", state);
		});

		executor.onError((error) => {
			toast.error(`Action execution failed: ${error.message}`);
		});

		executor.execute().catch((error) => {
			// Error already handled by executor
			console.error("Action execution failed:", error);
		});
	};

	return (
		<div className="w-full items-center flex justify-center">
			<div className="container py-8">
				<div className="mb-8">
					<h1 className="text-3xl font-bold">DataMatrix QR System</h1>
					<p className="text-muted-foreground mt-2">
						Revolutionary bidirectional communication system enabling
						sophisticated workflows through a single scan
					</p>
				</div>

				<Tabs defaultValue="showcase" className="space-y-6">
					<TabsList className="grid w-full grid-cols-3">
						<TabsTrigger value="showcase" className="flex items-center gap-2">
							<Lightbulb className="h-4 w-4" />
							Showcase
						</TabsTrigger>
						<TabsTrigger value="builder" className="flex items-center gap-2">
							<Code className="h-4 w-4" />
							Flow Builder
						</TabsTrigger>
						<TabsTrigger value="scanner" className="flex items-center gap-2">
							<Zap className="h-4 w-4" />
							Scanner
						</TabsTrigger>
					</TabsList>

					<TabsContent value="showcase" className="space-y-6">
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Database className="h-5 w-5" />
										Sample DataMatrix
									</CardTitle>
									<CardDescription>
										Example of a DataMatrix code that connects to WiFi
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="flex flex-col items-center gap-4">
										<DataMatrixCode
											value={sampleAction}
											size={200}
											format="datamatrix"
										/>
										<div className="text-center">
											<p className="text-sm text-muted-foreground">
												Scan this DataMatrix to connect to our guest WiFi
												network
											</p>
										</div>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<QrCode className="h-5 w-5" />
										Sample QR Code
									</CardTitle>
									<CardDescription>
										Same action encoded as a QR code for compatibility
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="flex flex-col items-center gap-4">
										<DataMatrixCode
											value={sampleAction}
											size={200}
											format="qr"
										/>
										<div className="text-center">
											<p className="text-sm text-muted-foreground">
												Scan this QR code for the same WiFi connection action
											</p>
										</div>
									</div>
								</CardContent>
							</Card>
						</div>

						<Card>
							<CardHeader>
								<CardTitle>How It Works</CardTitle>
								<CardDescription>
									Revolutionary bidirectional communication system
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
									<div className="space-y-2 p-4 border rounded-lg">
										<div className="font-medium">1. Flow Builder</div>
										<p className="text-sm text-muted-foreground">
											Business owners create complex interaction flows using our
											visual builder
										</p>
									</div>
									<div className="space-y-2 p-4 border rounded-lg">
										<div className="font-medium">2. Code Generation</div>
										<p className="text-sm text-muted-foreground">
											Actions are encoded into compact DataMatrix or QR codes
										</p>
									</div>
									<div className="space-y-2 p-4 border rounded-lg">
										<div className="font-medium">3. Progressive Execution</div>
										<p className="text-sm text-muted-foreground">
											Scanned actions execute progressively for optimal user
											experience
										</p>
									</div>
								</div>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="builder" className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Code className="h-5 w-5" />
									Visual Flow Builder
								</CardTitle>
								<CardDescription>
									Create sophisticated interaction flows without coding
								</CardDescription>
							</CardHeader>
							<CardContent>
								<DataMatrixFlowBuilder />
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="scanner" className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Zap className="h-5 w-5" />
									DataMatrix Scanner
								</CardTitle>
								<CardDescription>
									Scan DataMatrix and QR codes to trigger actions
								</CardDescription>
							</CardHeader>
							<CardContent>
								<DataMatrixScanner onActionDetected={handleActionDetected} />
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}
