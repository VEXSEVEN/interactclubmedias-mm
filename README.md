# Interact Club Medias - Murder Mystery

Aplicație Next.js 15 (export static) + Firebase Realtime Database, albastru/alb, UI cu [Glisse](https://glisse.kelvinzhang.ca) (Liquid Glass), instalabilă ca PWA pe iPhone, Android și desktop.

## Aplicația instalată (PWA)
- Din **browser** se văd doar Formularul, Statusul (cu parola contului după plată) și ghidul **/install**. Login-ul de jucător merge **doar în aplicația instalată** (pentru test: `?browser=1`).
- `/install` detectează iPhone / Android / computer și arată tutorialul potrivit (pe Android și butonul „Instalează”).
- La prima deschidere a aplicației, jucătorul și stația primesc direct cererea de notificări.
- Ecran negru de încărcare până se încarcă autentificarea, setările (din cache, apoi live) și datele.

## Notificări și mesagerie
- Orice punctaj, eliberare de stație sau mesaj de la organizatori e un **eveniment** cu id unic (`events/<țintă>/<id>`). Fiecare id e memorat local: notificarea apare o singură dată, iar schimbarea tab-urilor nu o mai repetă. Ce a venit cât aplicația era închisă nu se renotifică, ci apare în **Mesaje** (+ un singur toast).
- **Cu aplicația închisă (și în fundal)** orice telefon primește mesaje doar printr-un server care trimite push FCM. Alege una: `functions/` (planul Blaze) **sau** `push-server/` (gratuit, pe serverul tău, vezi `push-server/README.md`). Fără niciuna, mesajele se văd la următoarea deschidere. În Mesaje, developerul vede câte dispozitive sunt înregistrate pentru push.
- Organizator și developer trimit mesaje din secțiunea **Mesaje** (către toți, toate echipele, toate stațiile sau o echipă).

## Temă
- **Doar developerul** controlează culorile, pe componente (Developer → Temă): culoarea principală (din ea se calculează tot textul), fundal, subtitluri = text amestecat cu X% (implicit 10%) din culoarea fundalului, butoane, borduri, tab selectat, liber/ocupat, sticlă (culoare, opacitate, refracție, blur, luciu). Organizatorul schimbă doar titlurile, imaginile, regulamentul etc.

## Navigare
- Totul se navighează din dock-uri Glisse. În Organizator / Developer apare un **al doilea dock** cu secțiunile panoului, iar în dreapta, separat, dock-ul cu „Înapoi la site” și „Deconectare”.

## Fluxul unei echipe
1. **Formular (`/`)** – regulament (buton deblocat după N secunde) → date echipă/membri → descarcă documentele puse de organizator și le **reîncarcă semnate** → „Te-ai înregistrat!” + cod de înscriere. Se vede câte locuri au rămas.
2. **Status (`/status`)** – cu codul de înscriere: în așteptare / aprobată / achitată / respinsă.
3. **Ziua evenimentului** – organizatorul apasă **Marchează achitat** în *Înscrieri*. Se creează automat echipa (cu punctaj 0) și un cont: **utilizator = numele echipei**, parolă generată. Parola apare pe pagina de status.
4. **Jucător (`/jucator`)** – login cu numele echipei + parola: punctaj în timp real, stații libere/ocupate, traseu, clasament, notificări.

## Pagini staff
| Rută | Rol | Ce face |
|---|---|---|
| `/statie` | station (cod), organizer | Intri **doar cu codul stației** (8 caractere, generat în Organizator → Stații). Check-in/check-out de echipe; stația devine **Ocupată doar când sunt prezente 2 echipe** (configurabil), altfel rămâne Liberă. Adaugă punctaj |
| `/organizator` | organizer | Panou cu Dashboard, Înscrieri (aprobă/achită/respinge, documente încărcate, CSV), Formular & Builder (întrebări, documente), Variabile & Reguli, Stații, Rotație, Setări (imagini, regulament, locuri) |
| `/developer` | developer | Conturi, mesagerie, temă + imagini, Date în 4 tab-uri: Storage / Firestore / Realtime DB / Echipe (cine ce a completat) |
| `/login` | staff | „Cod stație” sau „Organizator / Dev” (email + parolă) |

## Pornire
```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # genereaza folderul out/ (site static)
```

## Firebase (proiect `interactmedias-psj`)
1. **Authentication** → activează *Email/Password*.
2. **Realtime Database** → Rules → lipește conținutul din `database.rules.json` → Publish.
3. **Storage** → Get started → Rules → lipește `storage.rules`. Opțional **Firestore** → `firestore.rules` (doar pentru tab-ul Firestore).
   (sau `firebase deploy --only database,storage,firestore`)
4. **Primul developer** (o singură dată, manual):
   - Authentication → Add user (email + parolă).
   - Realtime Database → adaugă la rădăcină: `users/<UID-ul-contului>` = `{ "role": "developer", "email": "emailul@tau" }`.
   - Din acel moment creezi toate celelalte conturi din `/developer`.
5. Intră ca developer → creează conturi de organizator și de stație (după ce organizatorul a creat stațiile).

## Notificări
- **Fără server**: funcționează cât timp aplicația e deschisă / în fundal pe Android și pe iPhone (PWA instalată din *Share → Add to Home Screen*, iOS 16.4+). Jucătorul apasă „Activează notificările”.
- **Cu aplicația închisă** (push real):
  1. Firebase Console → Project settings → Cloud Messaging → *Web Push certificates* → Generate key pair.
  2. Pune cheia în `.env.local`: `NEXT_PUBLIC_FIREBASE_VAPID_KEY=...` și rebuild.
  3. `cd functions && npm install && cd .. && firebase deploy --only functions` (necesită planul Blaze).
  Funcțiile trimit push la punctaj nou (doar echipei respective) și la eliberarea unei stații (tuturor).

## Rotația
Organizatorul setează numărul max. de echipe și persoane/echipă (Formular) și capacitatea fiecărei stații în persoane (Stații). Din tab-ul *Rotație*, „Generează” amestecă echipele și stațiile și creează un program pe runde în care două grupuri nu ajung niciodată la aceeași stație în aceeași rundă, iar fiecare echipă trece prin toate stațiile.

## Email de confirmare (opțional)
`functions/index.js` conține `onRegistration`, care trimite emailul „Te-ai înregistrat” la adresa din câmpul cu id `email`. Setează în `functions/.env`: `SMTP_URL`, `MAIL_FROM`, `SITE_URL`, apoi `firebase deploy --only functions`. Fără asta, mesajul apare doar pe ecran.

## De știut
- Variabilele și regulile rulează în browserul organizatorului la aprobare / respingere / achitare (nu la trimiterea formularului).
- Parola echipei este stocată în `credentials/<cod>` și se citește doar cunoscând codul înscrierii (8 caractere).
- Ștergerea unei echipe șterge datele din bază, dar contul de autentificare rămâne în Firebase Console.
- Regulile Firebase nu pot număra echipele: limita `maxTeams` e verificată în aplicație; organizatorul poate șterge înscrieri nedorite.
- Ștergerea unui cont din `/developer` șterge doar profilul; contul de autentificare se elimină din Firebase Console.
- Cheia Firebase Web din `src/lib/firebase.ts` este publică prin natura ei; securitatea vine din regulile bazei de date.
