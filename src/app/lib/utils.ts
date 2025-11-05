export function generateUniqueId(prefix: string = "id"): string {
    const now = new Date();

    const formattedDate = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
        String(now.getHours()).padStart(2, "0"),
        String(now.getMinutes()).padStart(2, "0"),
        String(now.getSeconds()).padStart(2, "0"),
        String(now.getMilliseconds()).padStart(3, "0"),
    ].join("");

    return `${prefix}_${formattedDate}`;
}

/**
 * Determines the Yuno API base URL based on the public API key
 * @param publicApiKey - The public API key from environment variables
 * @returns The appropriate Yuno API base URL
 */
export function getYunoApiBaseUrl(publicApiKey: string): string {
    if (publicApiKey.startsWith("sandbox_")) {
        return "https://api-sandbox.y.uno";
    } else if (publicApiKey.startsWith("prod_")) {
        return "https://api.y.uno";
    } else {
        // Default to sandbox for safety
        console.warn("Public API key doesn't match expected format, defaulting to sandbox environment");
        return "https://api-sandbox.y.uno";
    }
}