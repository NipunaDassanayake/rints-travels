const KEY_ID = /^[A-Za-z0-9_-]{1,32}(?![\s\S])/;

const invalidConfiguration = () => new Error("AUTH_RECOVERY_CONFIG_INVALID");

// Recovery support is mandatory even when NEW bound-session issuance is disabled.
// Existing bound sessions must retain access to their recovery keys.
const parseRecoveryConfiguration = ({ keysJson, activeKeyId, issuanceEnabled = false }) => {
  try {
    if (typeof keysJson !== "string" || keysJson.includes("\\") || typeof activeKeyId !== "string" || !KEY_ID.test(activeKeyId)) {
      throw invalidConfiguration();
    }
    const parsed = JSON.parse(keysJson);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw invalidConfiguration();
    const sourceIds = [...keysJson.matchAll(/"([^"\\]*)"\s*:/g)].map((match) => match[1]);
    if (sourceIds.length !== Object.keys(parsed).length || new Set(sourceIds).size !== sourceIds.length ||
        sourceIds.some((id) => !KEY_ID.test(id))) throw invalidConfiguration();
    const keys = new Map();
    for (const [id, encoded] of Object.entries(parsed)) {
      if (!KEY_ID.test(id) || typeof encoded !== "string" || !/^[A-Za-z0-9+/]{43}=$/.test(encoded)) {
        throw invalidConfiguration();
      }
      const key = Buffer.from(encoded, "base64");
      if (key.length !== 32 || key.toString("base64") !== encoded) throw invalidConfiguration();
      keys.set(id, key);
    }
    if (!keys.has(activeKeyId) || typeof issuanceEnabled !== "boolean") throw invalidConfiguration();
    return { keys, activeKeyId, issuanceEnabled };
  } catch {
    throw invalidConfiguration();
  }
};

module.exports = { KEY_ID, parseRecoveryConfiguration };
