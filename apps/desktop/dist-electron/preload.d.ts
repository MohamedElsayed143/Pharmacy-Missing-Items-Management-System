export interface ElectronAPI {
    getAppVersion: () => Promise<string>;
    getPlatform: () => string;
    isWindows7: () => Promise<boolean>;
    minimizeWindow: () => void;
    maximizeWindow: () => void;
    closeWindow: () => void;
}
//# sourceMappingURL=preload.d.ts.map