const { test } = require("node:test");
const assert = require("node:assert/strict");
const binding = require("../../src/modules/auth/helpers/auth.browserBinding");
const { createBoundCookies } = require("../../src/modules/auth/helpers/auth.boundCookies");
const { createTrustedAuthOrigin, trustedFrontendOrigin, normalizeOrigin } = require("../../src/middlewares/trustedAuthOrigin");
const f = require("./fixtures");
const local = createBoundCookies({ secure: false, sameSite: "strict", nodeEnv: "development" });
const secure = createBoundCookies({ secure: true, sameSite: "none", nodeEnv: "production" });

test("binding is generated server-side, hashed, checked and never mutates session on rejection", () => {
  const a = binding.generateBinding(f.sessionId);
  const b = binding.generateBinding(f.sessionId);
  assert.ok(a.value !== b.value);
  const session = Object.freeze({ sessionId: f.sessionId, browserBindingHash: a.hash });
  assert.equal(binding.requireBinding(a.value, session), true);
  assert.equal(binding.parseBinding(a.value).sessionId, f.sessionId);
  assert.ok(!JSON.stringify(session).includes(a.value.split(".")[1]));
  assert.equal(binding.equalBindingHashes(a.hash, a.hash), true);
  assert.equal(binding.equalBindingHashes(a.hash, b.hash), false);
  for (const bad of [null, undefined, "", "bad", a.value + ".extra", a.value.replace(f.sessionId, f.otherId), b.value]) {
    assert.throws(() => binding.requireBinding(bad, session), { code: "AUTH_SESSION_INVALID", statusCode: 401 });
  }
  for (const bad of [null, "", "a", "G".repeat(64), "a".repeat(63)]) assert.equal(binding.equalBindingHashes(a.hash, bad), false);
});

test("cookie names and fixed absolute expiry obey production/local contracts", () => {
  assert.equal(secure.bindingName, "__Host-travora_session_binding");
  assert.equal(local.bindingName, "travora_session_binding");
  assert.equal(secure.cookieName(f.sessionId, "3"), "__Host-travora_refresh_v2_11111111111141118111111111111111_3");
  assert.deepEqual(secure.parseName(secure.cookieName(f.sessionId, "3")), { sessionId: f.sessionId, generation: "3" });
  const options = secure.options(f.now);
  assert.equal(options.path, "/");
  assert.equal(options.httpOnly, true);
  assert.equal(options.secure, true);
  assert.equal(options.sameSite, "none");
  assert.equal(+options.expires, +f.now);
  assert.equal("maxAge" in options, false);
  assert.equal("domain" in options, false);
  assert.equal(secure.clearBinding().options.maxAge, 0);
  assert.equal(+secure.clearBinding().options.expires, 0);
  assert.throws(() => createBoundCookies({ secure: false, sameSite: "strict", nodeEnv: "production" }));
  assert.throws(() => createBoundCookies({ secure: false, sameSite: "none", nodeEnv: "development" }));
});

test("raw cookie parser retains untrusted candidates and rejects duplication/ambiguity", () => {
  const b = binding.generateBinding(f.sessionId);
  const name = local.cookieName(f.sessionId, "1");
  const parsed = local.parse(`${name}=${f.token}; other=ok; ${local.bindingName}=${b.value}`);
  assert.equal(parsed.candidates.length, 1);
  assert.ok(parsed.candidates[0].token === f.token);
  assert.ok(parsed.binding === b.value);
  assert.deepEqual(local.parse(undefined), { binding: null, candidates: [] });
  for (const cookie of [
    `${name}=${f.token}; ${name}=${f.token}`,
    `${local.bindingName}=${b.value}; ${local.bindingName}=${b.value}`,
    `${local.bindingName}=bad`, `${name}=`, `${name}=bad`, `${name}=${"a".repeat(2049)}.b.c`,
    `${name}=${f.token}\r\n`, `${name}_1=${f.token}`, `${name.replace(/_1$/, "_01")}=${f.token}`,
    `${secure.bindingName}=${b.value}`, `${secure.cookieName(f.sessionId, "1")}=${f.token}`,
    `${local.bindingName}=${b.value}; ${secure.bindingName}=${b.value}`,
  ]) assert.throws(() => local.parse(cookie), { code: "AUTH_SESSION_INVALID" });
  const candidates = Array.from({ length: 16 }, (_, i) => `${local.cookieName(f.sessionId, String(i))}=${f.token}`);
  assert.equal(local.parse(candidates.join("; ")).candidates.length, 16);
  assert.throws(() => local.parse([...candidates, `${local.cookieName(f.sessionId, "16")}=${f.token}`].join("; ")));
});

test("cleanup deletes only observed lower generations in the returned session", () => {
  const observed = ["0", "1", "2", "3"].map((gen) => ({ name: local.cookieName(f.sessionId, gen) }));
  observed.push({ name: local.cookieName(f.otherId, "0") });
  const cleared = local.clearLowerGenerations(observed, f.sessionId, "2");
  assert.deepEqual(cleared.map((c) => c.name), observed.slice(0, 2).map((c) => c.name));
  for (const c of cleared) {
    assert.equal(c.value, "");
    assert.equal(c.options.maxAge, 0);
    assert.equal(c.options.path, "/");
  }
  assert.deepEqual(local.clearLowerGenerations(observed, f.sessionId, "0"), []);
  assert.throws(() => local.clearLowerGenerations([{ name: "*" }], f.sessionId, "2"));
});

test("trusted Origin uses exact normalized origin and never other request headers", () => {
  const validate = createTrustedAuthOrigin({ frontendUrl: "https://travora.example", nodeEnv: "production" });
  const call = (rawHeaders) => {
    let result;
    validate({ rawHeaders, headers: { referer: "https://travora.example/", host: "travora.example" } },
      new Proxy({}, { get() { throw new Error("Origin validator must not mutate response"); } }), (error) => { result = error || true; });
    return result;
  };
  assert.equal(call(["Origin", "https://travora.example:443"]), true);
  assert.equal(call(["origin", "https://TRAVORA.example"]), true);
  for (const value of ["null", "https://travora.example.attacker.test", "http://travora.example", "https://travora.example:444",
    "https://travora.example/", "https://travora.example/path", "https://user@travora.example", "https://travora.example, https://evil.example",
    " https://travora.example", "https://travora.example#x", "https://travora.example?x", "https://travora.example\\evil"]) {
    const error = call(["Origin", value]);
    assert.equal(error.code, "AUTH_ORIGIN_REJECTED");
    assert.equal(error.statusCode, 403);
  }
  assert.equal(call([]).code, "AUTH_ORIGIN_REJECTED");
  assert.equal(call(["Origin", "https://travora.example", "ORIGIN", "https://travora.example"]).code, "AUTH_ORIGIN_REJECTED");
  assert.equal(trustedFrontendOrigin("http://localhost:3000", "development"), "http://localhost:3000");
  assert.throws(() => trustedFrontendOrigin("http://localhost:3000", "production"), { message: "AUTH_ORIGIN_CONFIG_INVALID" });
  assert.equal(normalizeOrigin("http://localhost:80"), "http://localhost");
});
