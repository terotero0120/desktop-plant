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
  systemPreferences,
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
  GROWTH_THRESHOLD,
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
let statusWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

function broadcastState(): void {
  const state = getState();
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send(IPC_CHANNELS.STATE_UPDATE, state);
    }
  });
}

function broadcastCollection(): void {
  const collection = getCollection();
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send(IPC_CHANNELS.COLLECTION_UPDATE, collection);
    }
  });
}

function applyOverlaySettings(win: BrowserWindow): void {
  win.setAlwaysOnTop(true, "floating");
  // setVisibleOnAllWorkspaces is macOS-only (Electron limitation)
  if (process.platform === "darwin") {
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }
}

async function initInputEngineWithPermissionCheck(): Promise<void> {
  if (process.platform !== "darwin") {
    initInputEngine(broadcastState, broadcastCollection);
    return;
  }

  if (systemPreferences.isTrustedAccessibilityClient(false)) {
    initInputEngine(broadcastState, broadcastCollection);
    return;
  }

  const opts = {
    type: "warning" as const,
    title: "アクセシビリティの権限が必要です",
    message:
      "キーボード・マウスの操作を検知するにはアクセシビリティの権限が必要です。",
    detail: [
      "【設定手順】",
      "1.「システム設定を開く」をクリック",
      "2.「アクセシビリティ」の一覧から Desktop Plant を許可",
      "3. アプリを再起動",
      "",
      "権限を付与しなくてもアプリは起動しますが、植物の成長機能は動作しません。",
    ].join("\n"),
    buttons: ["システム設定を開く", "後で設定する"],
    defaultId: 0,
  };
  const { response } = await (mainWindow
    ? dialog.showMessageBox(mainWindow, opts)
    : dialog.showMessageBox(opts));
  if (response === 0) {
    shell.openExternal(
      "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
    );
  }
}

function createStatusWindow(): void {
  if (statusWindow && !statusWindow.isDestroyed()) {
    statusWindow.focus();
    return;
  }
  statusWindow = new BrowserWindow({
    width: 360,
    height: 435,
    title: "ステータス",
    autoHideMenuBar: true,
    resizable: false,
    webPreferences: COMMON_WEB_PREFERENCES,
  });
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    statusWindow.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}?view=status`);
  } else {
    statusWindow.loadFile(join(__dirname, "../renderer/index.html"), {
      query: { view: "status" },
    });
  }
  statusWindow.on("closed", () => {
    statusWindow = null;
  });
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
  if (process.platform === "darwin") {
    iconImage.setTemplateImage(true);
  }

  tray = new Tray(iconImage);
  tray.setToolTip("Desktop Plant");

  const contextMenu = Menu.buildFromTemplate([
    { label: "次のタネを植える", click: onNextSeed },
    { type: "separator" },
    {
      label: "ステータスを見る",
      click: (): void => {
        createStatusWindow();
      },
    },
    { label: "図鑑を見る", click: createCollectionWindow },
    { type: "separator" },
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
  ipcMain.handle(IPC_CHANNELS.GET_STATUS, () => ({
    state: getState(),
    growthThreshold: GROWTH_THRESHOLD,
  }));

  function doNextSeed(): void {
    resetPlant();
    flushState();
    broadcastState();
  }

  ipcMain.handle(IPC_CHANNELS.PLANT_NEXT_SEED, () => {
    doNextSeed();
    return getState();
  });

  ipcMain.on(IPC_CHANNELS.SHOW_CONTEXT_MENU, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const menu = Menu.buildFromTemplate([
      { label: "次のタネを植える", click: doNextSeed },
      { type: "separator" },
      {
        label: "ステータスを見る",
        click: (): void => {
          createStatusWindow();
        },
      },
      { label: "図鑑を見る", click: createCollectionWindow },
      { type: "separator" },
      {
        label: "プライバシーについて",
        click: (): void => {
          void showPrivacyDialog();
        },
      },
      { type: "separator" },
      { label: "終了", click: (): void => app.quit() },
    ]);
    if (win) menu.popup({ window: win });
  });

  createWindow();
  createTray(doNextSeed);
  await initInputEngineWithPermissionCheck();

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
