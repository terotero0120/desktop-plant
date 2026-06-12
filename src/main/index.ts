import {
  app,
  shell,
  BrowserWindow,
  Tray,
  Menu,
  dialog,
  nativeImage,
  Notification,
  screen,
  ipcMain,
  systemPreferences,
} from "electron";
import { join, sep } from "path";
import { fileURLToPath } from "url";
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

function broadcastToAll(channel: string, data: unknown): void {
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) win.webContents.send(channel, data);
  });
}

function broadcastState(): void {
  broadcastToAll(IPC_CHANNELS.STATE_UPDATE, getState());
}

function broadcastCollection(): void {
  broadcastToAll(IPC_CHANNELS.COLLECTION_UPDATE, getCollection());
}

function applyOverlaySettings(win: BrowserWindow): void {
  // setVisibleOnAllWorkspaces is macOS-only (Electron limitation)
  if (process.platform === "darwin") {
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false });
  }
}

let accessibilityPollTimer: ReturnType<typeof setInterval> | null = null;

const ACCESSIBILITY_POLL_INTERVAL_MS = 1500;
// 無期限ポーリングを避けるため一定時間で打ち切る（ユーザーが許可しない場合の安全弁）。
const ACCESSIBILITY_POLL_TIMEOUT_MS = 30 * 60_000;

function stopAccessibilityPolling(): void {
  if (accessibilityPollTimer) {
    clearInterval(accessibilityPollTimer);
    accessibilityPollTimer = null;
  }
}

function notifyInputEngineStarted(): void {
  if (Notification.isSupported()) {
    new Notification({
      title: "Typebloom",
      body: "アクセシビリティを検知しました。植物の成長を開始します🌱",
    }).show();
  }
}

async function initInputEngineWithPermissionCheck(): Promise<void> {
  if (process.platform !== "darwin") {
    try {
      initInputEngine(broadcastState, broadcastCollection);
    } catch (err) {
      console.error("[typebloom] input engine failed to start:", err);
    }
    return;
  }

  if (systemPreferences.isTrustedAccessibilityClient(false)) {
    try {
      initInputEngine(broadcastState, broadcastCollection);
    } catch (err) {
      console.error("[typebloom] input engine failed to start:", err);
    }
    return;
  }

  // prompt=true でアクセシビリティの一覧にアプリを登録し、OS のプロンプトを出す。
  // これを呼ばないと一覧にアプリが現れず、ユーザーが許可できないことがある。
  systemPreferences.isTrustedAccessibilityClient(true);

  const opts = {
    type: "warning" as const,
    title: "アクセシビリティの権限が必要です",
    message:
      "キーボード・マウスの操作を検知するにはアクセシビリティの権限が必要です。",
    detail: [
      "【設定手順】",
      "1.「システム設定を開く」をクリック",
      "2.「アクセシビリティ」の一覧で Typebloom をオンにする",
      "",
      "許可するとその場で植物の成長が始まります（アプリの再起動は不要です）。",
      "権限を付与しなくてもアプリは起動しますが、成長機能は動作しません。",
    ].join("\n"),
    buttons: ["システム設定を開く", "後で設定する"],
    defaultId: 0,
  };
  // ダイアログは親なしで表示する: mainWindow は show:false の小窓で、
  // app.dock.hide() 後はフォーカスも不安定なため、親に紐付けると見えないことがある。
  app.focus({ steal: true });
  const { response } = await dialog.showMessageBox(opts);
  if (response === 0) {
    shell.openExternal(
      "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
    );
  }

  // 許可されるまでポーリングし、許可された瞬間に再起動なしで入力エンジンを開始する。
  stopAccessibilityPolling();
  const pollStartedAt = Date.now();
  accessibilityPollTimer = setInterval(() => {
    if (systemPreferences.isTrustedAccessibilityClient(false)) {
      stopAccessibilityPolling();
      try {
        initInputEngine(broadcastState, broadcastCollection);
        broadcastState();
        notifyInputEngineStarted();
      } catch (err) {
        // アドホック署名では TCC 上「許可済み」でもフック生成に失敗することがある。
        // setInterval コールバック内の例外で main プロセスを落とさないよう握る。
        console.error(
          "[typebloom] input engine failed to start after permission grant:",
          err,
        );
      }
      return;
    }
    if (Date.now() - pollStartedAt >= ACCESSIBILITY_POLL_TIMEOUT_MS) {
      stopAccessibilityPolling();
      console.warn(
        "[typebloom] accessibility permission was not granted within the timeout; stopped polling.",
      );
    }
  }, ACCESSIBILITY_POLL_INTERVAL_MS);
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
      "Typebloom のデータ収集について",
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
  tray.setToolTip("Typebloom");

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

  // macOS では setContextMenu 済みのトレイはクリックでメニューが開くため
  // click イベントが発火しない。このトグル処理は Windows 専用。
  tray.on("click", () => {
    if (!mainWindow) {
      createWindow();
    } else if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      applyOverlaySettings(mainWindow);
    }
  });
}

function openExternalSafe(url: string): void {
  try {
    if (new URL(url).protocol === "https:") {
      shell.openExternal(url);
    }
  } catch {
    // 不正なURLは無視する
  }
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
    alwaysOnTop: false,
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

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId("com.typebloom.app");

  // Dock アイコンを非表示にする（トレイ常駐アプリのため）。
  // Info.plist の LSUIElement ではなく実行時の dock.hide() を使う点が重要:
  // LSUIElement(=起動時アクセサリ化) だと植物ウィンドウが常に最前面に浮いてしまい
  // デスクトップ専用表示（PR #31, 他ウィンドウの裏に隠れる）が壊れる。
  // 実行時の dock.hide() は最前面化の副作用がないため両立できる。
  app.dock?.hide();

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  app.on("web-contents-created", (_, wc) => {
    wc.setWindowOpenHandler((details) => {
      openExternalSafe(details.url);
      return { action: "deny" };
    });

    wc.on("will-navigate", (event, url) => {
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        event.preventDefault();
        return;
      }

      if (is.dev) {
        const rendererUrl = process.env["ELECTRON_RENDERER_URL"];
        try {
          if (rendererUrl && parsed.origin === new URL(rendererUrl).origin)
            return;
        } catch {
          // 不正な ELECTRON_RENDERER_URL はブロック
        }
      } else if (parsed.protocol === "file:") {
        try {
          const filePath = fileURLToPath(url);
          const rendererDir = join(__dirname, "..", "renderer");
          if (filePath.startsWith(rendererDir + sep)) return;
        } catch {
          // UNC などローカル以外の file URL はブロック
        }
      }

      event.preventDefault();
    });
  });

  try {
    await initStore();
  } catch (err) {
    console.error("[typebloom] store initialization failed:", err);
    app.quit();
    return;
  }

  if (!getConsent()) {
    await showPrivacyDialog();
    setConsent();
    flushConsent();
  }

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
  stopAccessibilityPolling();
  stopInputEngine();
});
