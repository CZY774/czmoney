export interface VersionInfo {
  version: string;
  buildTime: string;
}

let cachedVersion: VersionInfo | null = null;

export async function checkForUpdates(): Promise<{
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
}> {
  try {
    const response = await fetch("/api/version");
    if (!response.ok) throw new Error("Failed to fetch version");

    const latestVersion: VersionInfo = await response.json();

    if (!cachedVersion) {
      cachedVersion = latestVersion;
      return {
        hasUpdate: false,
        currentVersion: latestVersion.version,
        latestVersion: latestVersion.version,
      };
    }

    const hasUpdate = latestVersion.buildTime !== cachedVersion.buildTime;

    return {
      hasUpdate,
      currentVersion: cachedVersion.version,
      latestVersion: latestVersion.version,
    };
  } catch (error) {
    console.error("Version check failed:", error);
    return {
      hasUpdate: false,
      currentVersion: "unknown",
      latestVersion: "unknown",
    };
  }
}

export function resetVersionCache() {
  cachedVersion = null;
}
