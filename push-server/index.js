/**
 * Server de notificari push (alternativa gratuita la Cloud Functions / planul Blaze).
 * Ruleaza pe orice server care sta pornit (VPS, Raspberry Pi, Docker) si asculta /events din Realtime Database,
 * apoi trimite push FCM catre telefoanele inregistrate (pushTokens) — si cand aplicatia e INCHISA.
 *
 *   1. Firebase Console > Project settings > Service accounts > Generate new private key -> service-account.json
 *   2. SERVICE_ACCOUNT=./service-account.json DATABASE_URL=https://<proiect>-default-rtdb.<regiune>.firebasedatabase.app node index.js
 */
const admin = require("firebase-admin");

const serviceAccount = require(require("path").resolve(process.env.SERVICE_ACCOUNT || "./interactmedias-psj-firebase-adminsdk-fbsvc-53741f5128.json"));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.DATABASE_URL || "https://interactmedias-psj-default-rtdb.europe-west1.firebasedatabase.app",
});
const db = admin.database();

const startedAt = Date.now() - 60 * 1000; // ignora evenimentele mai vechi
const seen = new Set();
const watching = new Set();

async function send(tokens, data) {
  if (!tokens.length) return;
  for (let i = 0; i < tokens.length; i += 500) {
    const chunk = tokens.slice(i, i + 500);
    const res = await admin.messaging().sendEachForMulticast({ tokens: chunk, data, webpush: { headers: { Urgency: "high", TTL: "86400" } } });
    await Promise.all(
      res.responses.map((r, k) =>
        !r.success && /registration-token-not-registered|invalid-argument|invalid-registration-token/.test(r.error?.code || "")
          ? db.ref(`pushTokens/${chunk[k]}`).remove()
          : null
      )
    );
    console.log(`push: ${res.successCount} ok, ${res.failureCount} esuate`);
  }
}

async function handle(target, id, e) {
  if (!e || seen.has(id) || (e.ts || 0) < startedAt) return;
  seen.add(id);
  const all = Object.entries((await db.ref("pushTokens").get()).val() || {});
  const pick = all.filter(([, v]) => {
    if (target === "_all") return true;
    if (target === "_teams") return v.role === "team";
    if (target === "_stations") return v.role === "station";
    return v.teamId === target;
  });
  console.log(`eveniment ${id} -> ${target}: ${pick.length} dispozitive`);
  await send(pick.map(([t]) => t), { title: e.title, body: e.body, tag: id, url: e.type === "message" ? "/mesaje" : "/jucator" });
}

function watch(target) {
  if (watching.has(target)) return;
  watching.add(target);
  db.ref(`events/${target}`).on("child_added", (snap) => handle(target, snap.key, snap.val()).catch((err) => console.error(err)));
}

db.ref("events").on("child_added", (snap) => watch(snap.key));
console.log("Push server pornit. Ascult /events …");
