/**
 * Notificari push (FCM) cand aplicatia e inchisa.
 * Necesita planul Blaze. Cheia VAPID (NEXT_PUBLIC_FIREBASE_VAPID_KEY) e optionala.
 */
const { onValueWritten, onValueCreated } = require("firebase-functions/v2/database");
const nodemailer = require("nodemailer");
const admin = require("firebase-admin");
admin.initializeApp();

const REGION = "europe-west1";

async function send(tokens, data) {
  if (!tokens.length) return;
  const res = await admin.messaging().sendEachForMulticast({ tokens, data, webpush: { headers: { Urgency: "high" } } });
  const db = admin.database();
  await Promise.all(
    res.responses.map((r, i) =>
      !r.success && /registration-token-not-registered|invalid-argument/.test(r.error?.code || "")
        ? db.ref(`pushTokens/${tokens[i]}`).remove()
        : null
    )
  );
}

async function tokens(teamId) {
  const snap = await admin.database().ref("pushTokens").get();
  const all = snap.val() || {};
  return Object.entries(all).filter(([, v]) => !teamId || v.teamId === teamId).map(([t]) => t);
}

/**
 * Un singur trigger pentru toate evenimentele: /events/{target}/{id}
 * (punctaj adaugat, statie eliberata, mesaje de la organizatori).
 * Mesajul e data-only si are tag = id-ul evenimentului, deci aceeasi notificare nu se dubleaza.
 */
exports.onEvent = onValueCreated({ ref: "/events/{target}/{id}", region: REGION }, async (event) => {
  const e = event.data.val();
  if (!e) return;
  const { target, id } = event.params;
  const snap = await admin.database().ref("pushTokens").get();
  const all = Object.entries(snap.val() || {});
  const pick = all.filter(([, v]) => {
    if (target === "_all") return true;
    if (target === "_teams") return v.role === "team";
    if (target === "_stations") return v.role === "station";
    return v.teamId === target;
  });
  await send(
    pick.map(([t]) => t),
    { title: e.title, body: e.body, tag: id, url: e.type === "message" ? "/mesaje" : "/jucator" }
  );
});

/**
 * Email de confirmare la inscriere (optional). Seteaza in functions/.env:
 *   SMTP_URL=smtps://user:parola@smtp.exemplu.ro:465
 *   MAIL_FROM="Interact Club Medias <noreply@exemplu.ro>"
 *   SITE_URL=https://interactmedias-psj.web.app
 * Emailul se ia din campul cu id-ul "email" din formular.
 */
exports.onRegistration = onValueCreated({ ref: "/registrations/{code}", region: REGION }, async (event) => {
  const r = event.data.val();
  const to = r && r.answers && r.answers.email;
  if (!to || !process.env.SMTP_URL) return;
  const site = process.env.SITE_URL || "";
  await nodemailer.createTransport(process.env.SMTP_URL).sendMail({
    from: process.env.MAIL_FROM || "Interact Club Medias <noreply@localhost>",
    to,
    subject: "Te-ai înregistrat - Interact Club Medias · Murder Mystery",
    text:
      `Salut!\n\nEchipa "${r.teamName}" a fost înregistrată. Codul înscrierii: ${event.params.code}\n\n` +
      `Plata se face în ziua evenimentului. După confirmarea plății echipa se creează automat, iar pe pagina de status ` +
      `(${site}/status) primești parola contului. Utilizatorul este numele echipei.\n\nInteract Club Mediaș`,
  });
});
