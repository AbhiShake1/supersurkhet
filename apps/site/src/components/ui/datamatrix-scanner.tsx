import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { dataMatrixActionSchema, type DataMatrixAction } from "@/lib/datamatrix";
import { Scanner as QrScanner } from "@yudiel/react-qr-scanner";
import {
	Camera,
	Database,
	Pause,
	Play,
	QrCode,
	RotateCcw,
	Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ScannerProps {
	onActionDetected?: (action: DataMatrixAction) => void;
	showControls?: boolean;
	showManualInput?: boolean;
	showScanResults?: boolean;
}

export function DataMatrixScanner({
	onActionDetected,
	showControls = true,
	showManualInput = true,
	showScanResults = true
}: ScannerProps) {
	const [isScanning, setIsScanning] = useState(true);
	const [scannedData, setScannedData] = useState<string | null>(null);
	const [parsedAction, setParsedAction] = useState<DataMatrixAction | null>(
		null,
	);
	const [error, setError] = useState<string | null>(null);
	const [manualInput, setManualInput] = useState("");

	// Handle scan result
	const handleScan = (result: string) => {
		if (!result) return;

		setScannedData(result);
		parseActionData(result);
	};

	// Parse action data from scanned string
	const parseActionData = (data: string) => {
		try {
			// Try to parse as JSON
			const parsed = JSON.parse(data);

			// Validate against schema
			const validatedAction = dataMatrixActionSchema.parse(parsed);

			setParsedAction(validatedAction);
			setError(null);

			// Notify parent component
			onActionDetected?.(validatedAction);

			toast.success("Action detected successfully!");
		} catch (err) {
			console.error("Failed to parse action data:", err);
			setError("Failed to parse scanned data. Please try again.");
			setParsedAction(null);
			toast.error("Invalid action data");
		}
	};

	// Handle manual input submission
	const handleSubmitManualInput = () => {
		if (manualInput.trim()) {
			parseActionData(manualInput);
		}
	};

	// Reset scanner
	const resetScanner = () => {
		setScannedData(null);
		setParsedAction(null);
		setError(null);
		setManualInput("");
	};

	return (
		<div className="space-y-6">
			{/* Scanner View */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Camera className="h-5 w-5" />
						DataMatrix Scanner
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{isScanning ? (
							<div className="relative rounded-lg overflow-hidden border">
								<QrScanner
									onScan={(result) => handleScan(result[0]?.rawValue || "")}
									onError={(err) => {
										console.error("Scanner error:", err);
										setError(
											"Failed to access camera. Please check permissions.",
										);
									}}
									formats={["qr_code", "data_matrix"]}
								// className="w-full aspect-square"
								/>
								<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
									<div className="border-2 border-white rounded-lg w-64 h-64" />
								</div>
							</div>
						) : (
							<div className="flex flex-col items-center justify-center py-12 bg-muted rounded-lg">
								<Camera className="h-12 w-12 text-muted-foreground mb-4" />
								<p className="text-muted-foreground">Scanner is paused</p>
							</div>
						)}

						{showControls && (
							<div className="flex flex-wrap gap-2">
								<Button
									onClick={() => setIsScanning(!isScanning)}
									variant={isScanning ? "secondary" : "default"}
								>
									{isScanning ? (
										<>
											<Pause className="h-4 w-4 mr-2" />
											Pause Scanner
										</>
									) : (
										<>
											<Play className="h-4 w-4 mr-2" />
											Start Scanner
										</>
									)}
								</Button>

								<Button onClick={resetScanner} variant="outline">
									<RotateCcw className="h-4 w-4 mr-2" />
									Reset
								</Button>
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Manual Input */}
			{showManualInput && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Zap className="h-5 w-5" />
							Manual Input
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							<div>
								<Label htmlFor="manualInput">Action Data (JSON)</Label>
								<Textarea
									id="manualInput"
									value={manualInput}
									onChange={(e) => setManualInput(e.target.value)}
									placeholder='Paste JSON action data here: {"version": "1.0", "action": "wifi_connect", ...}'
									rows={6}
								/>
							</div>
							<Button onClick={handleSubmitManualInput} className="w-full">
								Process Action Data
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Scan Results */}
			{showScanResults && scannedData && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							{parsedAction ? (
								<QrCode className="h-5 w-5 text-green-500" />
							) : (
								<Database className="h-5 w-5 text-red-500" />
							)}
							Scan Results
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{error && (
								<div className="p-3 bg-red-100 text-red-800 rounded-md">
									{error}
								</div>
							)}

							{parsedAction ? (
								<div className="space-y-4">
									<div className="flex items-center justify-between p-3 bg-green-100 rounded-md">
										<span className="font-medium">Valid Action Detected</span>
										<span className="bg-green-500 text-white px-2 py-1 rounded text-sm">
											{parsedAction.action}
										</span>
									</div>

									<div>
										<h4 className="font-medium mb-2">Action Details</h4>
										<div className="text-sm space-y-2">
											<div className="flex justify-between">
												<span className="text-muted-foreground">Version</span>
												<span>{parsedAction.version}</span>
											</div>

											{parsedAction.wifi && (
												<div className="space-y-1">
													<div className="flex justify-between">
														<span className="text-muted-foreground">
															WiFi Network
														</span>
														<span>{parsedAction.wifi.ssid}</span>
													</div>
													<div className="flex justify-between">
														<span className="text-muted-foreground">
															Security
														</span>
														<span>{parsedAction.wifi.security}</span>
													</div>
												</div>
											)}

											{parsedAction.navigation && (
												<div className="space-y-1">
													<div className="flex justify-between">
														<span className="text-muted-foreground">
															Navigation URL
														</span>
														<span className="truncate max-w-[150px]">
															{parsedAction.navigation.url}
														</span>
													</div>
												</div>
											)}
										</div>
									</div>

									<div>
										<h4 className="font-medium mb-2">Raw Data</h4>
										<pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
											{JSON.stringify(parsedAction, null, 2)}
										</pre>
									</div>
								</div>
							) : (
								<div>
									<h4 className="font-medium mb-2">Scanned Data</h4>
									<pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
										{scannedData}
									</pre>
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
