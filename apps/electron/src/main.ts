import {
	app,
	BrowserWindow,
	shell,
	dialog,
	Tray,
	Menu,
	nativeImage,
} from "electron";
import * as path from "node:path";
import Store from "electron-store";
import { autoUpdater } from "electron-updater";
import log from "electron-log";

// Configure logging
log.transports.file.level = "info";
autoUpdater.logger = log;

// Initialize store for persistence
const store = new Store<{
	lastUrl: string;
	windowBounds: { width: number; height: number; x?: number; y?: number };
}>({
	defaults: {
		lastUrl: "https://surkhet.app",
		windowBounds: { width: 1280, height: 800 },
	},
});

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

const BASE_URL = "https://surkhet.app";

// Register custom protocol
if (process.defaultApp) {
	if (process.argv.length >= 2) {
		app.setAsDefaultProtocolClient("supersurkhet", process.execPath, [
			path.resolve(process.argv[1]),
		]);
	}
} else {
	app.setAsDefaultProtocolClient("supersurkhet");
}

// Force single instance
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
	app.quit();
} else {
	app.on("second-instance", (_event, commandLine, _workingDirectory) => {
		// Someone tried to run a second instance, we should focus our window.
		if (mainWindow) {
			if (mainWindow.isMinimized()) mainWindow.restore();
			mainWindow.focus();
		}
		// Handle the protocol url
		const url = commandLine.pop();
		if (url?.startsWith("supersurkhet://")) {
			handleDeepLink(url);
		}
	});

	app.on("ready", () => {
		createWindow();
		createTray();
		app.setLoginItemSettings({
			openAtLogin: true,
			openAsHidden: true,
			path: process.execPath,
			args: ["--hidden"],
		});
	});
}

// Handle macOS open-url event
app.on("open-url", (event, url) => {
	event.preventDefault();
	handleDeepLink(url);
});

function handleDeepLink(url: string) {
	try {
		const urlObj = new URL(url);
		if (urlObj.protocol === "supersurkhet:" && urlObj.host === "auth") {
			const dataStr = urlObj.searchParams.get("data");
			if (dataStr && mainWindow) {
				const data = JSON.parse(decodeURIComponent(dataStr));
				log.info("Received auth data via deep link");

				// Inject the auth data into the renderer
				// We use executeJavaScript to set localStorage and reload
				// Since the app uses Gun, we might need to be careful, but usually setting localStorage works for persistence
				// 'gun/' prefix is often used by Gun.
				// Based on auth.ts, setUser stores in localStorage?
				// Let's assume we can pass it to the window.

				mainWindow.webContents.executeJavaScript(`
					console.log("Received auth data from deep link");
					try {
						const authData = ${JSON.stringify(data)};
						// Save to localStorage so Gun picks it up or we can manually restore
						// The web app needs to know how to handle this.
						// For now, let's dispatch a custom event or set a temporary value
						window.postMessage({ type: 'DEEP_LINK_AUTH', data: authData }, '*');
					} catch(e) {
						console.error("Failed to handle auth data", e);
					}
				`);

				if (mainWindow.isMinimized()) mainWindow.restore();
				mainWindow.focus();
			}
		}
	} catch (e) {
		log.error("Failed to parse deep link", e);
	}
}

function createTray() {
	const iconPath = path.join(__dirname, "../assets/icon.png");
	const icon = nativeImage
		.createFromPath(iconPath)
		.resize({ width: 16, height: 16 });
	tray = new Tray(icon);
	tray.setToolTip("SuperSurkhet");

	const contextMenu = Menu.buildFromTemplate([
		{
			label: "Show App",
			click: () => {
				if (mainWindow) {
					mainWindow.show();
					mainWindow.focus();
				} else {
					createWindow();
				}
			},
		},
		{
			label: "Quit",
			click: () => {
				isQuitting = true;
				app.quit();
			},
		},
	]);

	tray.setContextMenu(contextMenu);

	tray.on("double-click", () => {
		if (mainWindow) {
			if (mainWindow.isVisible()) {
				mainWindow.hide();
			} else {
				mainWindow.show();
				mainWindow.focus();
			}
		}
	});
}

function createWindow() {
	const { width, height, x, y } = store.get("windowBounds");

	mainWindow = new BrowserWindow({
		width,
		height,
		x,
		y,
		show: false, // Don't show until ready-to-show
		webPreferences: {
			nodeIntegration: false,
			contextIsolation: true,
			sandbox: true,
			backgroundThrottling: false,
		},
		title: "SuperSurkhet",
		backgroundColor: "#ffffff",
	});

	// Handle window close (minimize to tray instead of quit)
	mainWindow.on("close", (event) => {
		if (!isQuitting) {
			event.preventDefault();
			mainWindow?.hide();
			return false;
		}
	});

	// Set custom user agent to identify Electron app
	const userAgent = mainWindow.webContents.getUserAgent();
	mainWindow.webContents.setUserAgent(`${userAgent} SuperSurkhetDesktop`);

	// Load the last visited URL or the base URL
	const lastUrl = store.get("lastUrl");
	mainWindow.loadURL(lastUrl || BASE_URL);

	// Show window when ready to avoid flickering
	mainWindow.once("ready-to-show", () => {
		const { wasOpenedAsHidden } = app.getLoginItemSettings();
		const isHiddenArg = process.argv.includes("--hidden");
		if (!wasOpenedAsHidden && !isHiddenArg) {
			mainWindow?.show();
		}
	});

	// Save window bounds on resize/move
	const saveBounds = () => {
		if (mainWindow) {
			store.set("windowBounds", mainWindow.getBounds());
		}
	};
	mainWindow.on("resize", saveBounds);
	mainWindow.on("move", saveBounds);

	// Persist current URL
	mainWindow.webContents.on("did-navigate", (_event, url) => {
		// Only save if it's within our domain scope (optional, but good practice)
		if (url.startsWith(BASE_URL)) {
			store.set("lastUrl", url);
		}
	});

	mainWindow.webContents.on("did-navigate-in-page", (_event, url) => {
		if (url.startsWith(BASE_URL)) {
			store.set("lastUrl", url);
		}
	});

	// Handle external links - open in default browser
	mainWindow.webContents.setWindowOpenHandler(({ url }) => {
		const parsedUrl = new URL(url);

		if (url.includes("open_external=true")) {
			shell.openExternal(url);
			return { action: "deny" };
		}

		if (
			parsedUrl.hostname === "accounts.google.com" ||
			parsedUrl.hostname.endsWith(".google.com")
		) {
			return { action: "allow" };
		}

		if (!url.startsWith(BASE_URL)) {
			shell.openExternal(url);
			return { action: "deny" };
		}
		return { action: "allow" };
	});

	// Check for updates
	checkForUpdates();

	mainWindow.on("closed", () => {
		mainWindow = null;
	});
}

function checkForUpdates() {
	if (app.isPackaged) {
		autoUpdater.checkForUpdatesAndNotify();
	}
}

// Auto-updater events
autoUpdater.on("update-available", () => {
	log.info("Update available.");
});

autoUpdater.on("update-downloaded", () => {
	log.info("Update downloaded.");
	dialog
		.showMessageBox({
			type: "info",
			title: "Update Ready",
			message:
				"A new version of SuperSurkhet has been downloaded. Restart now to install?",
			buttons: ["Restart", "Later"],
		})
		.then((returnValue) => {
			if (returnValue.response === 0) {
				isQuitting = true;
				autoUpdater.quitAndInstall();
			}
		});
});

app.on("window-all-closed", () => {
	// Do not quit when all windows are closed
	// We want the app to keep running in the background
});

app.on("before-quit", () => {
	isQuitting = true;
});

app.on("activate", () => {
	if (mainWindow === null) {
		createWindow();
	} else {
		mainWindow.show();
	}
});
