import {
  app,
  shell,
  BrowserWindow,
  Tray,
  Menu,
  dialog,
  nativeImage,
  screen,
  ipcMain,
} from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import {
  initStore,
  getState,
  getCollection,
  resetPlant,
  flushState,
  IPC_CHANNELS,
  getConsent,
  setConsent,
  flushConsent,
} from "./store";
import { initInputEngine, stopInputEngine } from "./inputEngine";

const WINDOW_WIDTH = 200;
const WINDOW_HEIGHT = 300;
const WINDOW_MARGIN = 16;

// sandbox: false は uiohook-napi など native モジュールを main から
// IPC 経由で呼び出す際に必要になる可能性があるため残す
const COMMON_WEB_PREFERENCES = {
  preload: join(__dirname, "../preload/index.js"),
  contextIsolation: true,
  sandbox: false,
} as const;

let mainWindow: BrowserWindow | null = null;
let collectionWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

function applyOverlaySettings(win: BrowserWindow): void {
  win.setAlwaysOnTop(true, "floating");
  // setVisibleOnAllWorkspaces is macOS-only (Electron limitation)
  if (process.platform === "darwin") {
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }
}

async function showPrivacyDialog(): Promise<void> {
  await dialog.showMessageBox({
    type: "info",
    title: "プライバシーについて",
    message: "プライバシーについて",
    detail: [
      "Desktop Plant のデータ収集について",
      "",
      "このアプリはキーボード・マウスの操作量を計測し、植物の成長ポイントに変換します。",
      "",
      "• 入力内容（文字・キー名）は記録しません",
      "• 操作データは端末内にのみ保存されます",
      "• 外部へのデータ送信は一切行いません",
    ].join("\n"),
    buttons: ["OK"],
  });
}

function createCollectionWindow(): void {
  if (collectionWindow && !collectionWindow.isDestroyed()) {
    collectionWindow.focus();
    return;
  }
  collectionWindow = new BrowserWindow({
    width: 480,
    height: 600,
    title: "図鑑",
    autoHideMenuBar: true,
    webPreferences: COMMON_WEB_PREFERENCES,
  });
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    collectionWindow.loadURL(
      `${process.env["ELECTRON_RENDERER_URL"]}?view=collection`,
    );
  } else {
    collectionWindow.loadFile(join(__dirname, "../renderer/index.html"), {
      query: { view: "collection" },
    });
  }
  collectionWindow.on("closed", () => {
    collectionWindow = null;
  });
}

function createTray(onNextSeed: () => void): void {
  const iconImage = nativeImage.createFromPath(
    join(__dirname, "../../resources/icon.png"),
  );

  tray = new Tray(iconImage);
  tray.setToolTip("Desktop Plant");

  const contextMenu = Menu.buildFromTemplate([
    { label: "次のタネを植える", click: onNextSeed },
    { label: "図鑑", click: createCollectionWindow },
    {
      label: "プライバシーについて",
      click: (): void => {
        void showPrivacyDialog();
      },
    },
    { type: "separator" },
    { label: "終了", click: (): void => app.quit() },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on("click", () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        applyOverlaySettings(mainWindow);
      }
    }
  });
}

function createWindow(): void {
  const {
    x: workX,
    y: workY,
    width: workWidth,
    height: workHeight,
  } = screen.getPrimaryDisplay().workArea;

  mainWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    x: workX + workWidth - WINDOW_WIDTH - WINDOW_MARGIN,
    y: workY + workHeight - WINDOW_HEIGHT - WINDOW_MARGIN,
    frame: false,
    transparent: true,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    autoHideMenuBar: true,
    webPreferences: COMMON_WEB_PREFERENCES,
  });

  mainWindow.on("ready-to-show", () => {
    applyOverlaySettings(mainWindow!);
    mainWindow?.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId("com.desktopplant");

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  try {
    await initStore();
  } catch (err) {
    console.error("[desktop-plant] store initialization failed:", err);
    app.quit();
    return;
  }

  if (!getConsent()) {
    await showPrivacyDialog();
    setConsent();
    flushConsent();
  }

  ipcMain.handle(IPC_CHANNELS.GET_STATE, () => getState());
  ipcMain.handle(IPC_CHANNELS.GET_COLLECTION, () => getCollection());

  function doNextSeed(): void {
    resetPlant();
    flushState();
    const state = getState();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.STATE_UPDATE, state);
    }
  }

  ipcMain.handle(IPC_CHANNELS.PLANT_NEXT_SEED, () => {
    doNextSeed();
    return getState();
  });

  ipcMain.on(IPC_CHANNELS.SHOW_CONTEXT_MENU, (event) => {
    const menu = Menu.buildFromTemplate([
      { label: "次のタネを植える", click: doNextSeed },
      { label: "図鑑", click: createCollectionWindow },
      {
        label: "プライバシーについて",
        click: (): void => {
          void showPrivacyDialog();
        },
      },
      { type: "separator" },
      { label: "終了", click: (): void => app.quit() },
    ]);
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) menu.popup({ window: win });
  });

  createWindow();
  createTray(doNextSeed);
  initInputEngine(() => mainWindow);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// トレイ常駐アプリのためウィンドウを閉じてもプロセスは維持する
app.on("window-all-closed", () => {
  // intentionally empty: tray keeps the app alive
});

// 終了前にフックを停止・ポイントをフラッシュ
app.on("before-quit", () => {
  stopInputEngine();
});
