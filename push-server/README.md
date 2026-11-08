# Push server (notificări cu aplicația închisă, fără Blaze)

Telefoanele (iPhone / Android) nu pot primi mesaje cu aplicația închisă decât printr-un server care trimite push FCM.
Ai două variante, ambele folosesc aceleași date (`events/*` și `pushTokens/*`):

1. **Cloud Functions** (`functions/`) — necesită planul Blaze.
2. **Acest server** — gratuit, rulează pe un server al tău (ex. VPS-ul VEXSEVEN).

## Pornire
```bash
cd push-server && npm install
SERVICE_ACCOUNT=./service-account.json \
DATABASE_URL=https://interactmedias-psj-default-rtdb.europe-west1.firebasedatabase.app \
node index.js
```
`service-account.json` = Firebase Console → Project settings → Service accounts → *Generate new private key*. Nu îl pune în repo.

Docker:
```bash
docker build -t imc-push . 
docker run -d --restart=always -v $PWD/service-account.json:/app/service-account.json imc-push
```
Folosește **doar una** dintre variante (altfel notificările se trimit de două ori; același `tag` le înlocuiește oricum pe telefon).
