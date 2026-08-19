# Zeen LP Studio

Dynamic landing-page factory for **Google Ads**, **PropellerAds**, and future platforms.

- **Backend:** Spring Boot `2.7.18`, Java `15`, MySQL `8.0.33`
- **Frontend:** Vite + React + TypeScript

## What it does

1. Configure a landing page (country, operators, API, Google tags / Propeller postback, disclaimer).
2. Set **Public domain**, **URL path**, and **Server deploy path**.
3. Save in MySQL — dashboard shows the correct **campaign URL** for Google / Propeller / Other.
4. **Save & Deploy** (SFTP) uploads generated files to the server path, **or** Export ZIP → FileZilla.
5. New domain still needs nginx once (snippet `nginx-site.conf` is in the export).

## Folder layout

```
Landing Page Project Front_Back/
  backend/     Spring Boot API (:8088)
  frontend/    Vite admin UI (:5173)
```

## 1) MySQL setup

```sql
CREATE DATABASE lp_studio CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'root'@'localhost' IDENTIFIED BY 'root';
-- or update application.yml with your username/password
```

Edit:

`backend/src/main/resources/application.yml`

```yaml
spring:
  datasource:
    username: root
    password: YOUR_PASSWORD
```

## 2) Run backend

```bash
cd backend
mvn spring-boot:run
```

**Without MySQL (H2 in-memory demo):**

```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

API: `http://localhost:8088/api/health`

On first start, two sample LPs are seeded (Palestine Google + Oman Propeller).

## 3) Run frontend

```bash
cd frontend
npm install
npm run dev
```

Open: `http://localhost:5173`

## Workflow

1. **New LP** (or Georgia / Palestine / Oman preset).
2. Set **Public domain**, **URL path**, **Server deploy path**.
3. Fill operators + Google tags / Propeller postback → **Save**.
4. Dashboard shows **Live URL** + platform **Campaign URL** automatically:
   - Google → `?clickid={gclid}`
   - Propeller → `?clickid=${SUBID}&zoneid={zone_id}`
   - Other → `?clickid={clickid}`
5. **Save & Deploy** (SFTP) **or** Export ZIP → FileZilla.
6. New domain: apply `nginx-site.conf` from export once + certbot.

### Enable one-click Deploy

```bash
export LP_DEPLOY_ENABLED=true
export LP_DEPLOY_HOST=160.187.80.197
export LP_DEPLOY_USER=your_ssh_user
export LP_DEPLOY_PASSWORD='your_ssh_password'
# or: export LP_DEPLOY_KEY=/path/to/id_rsa
```

Then restart the backend.

## API summary

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/meta` | Platforms, templates, presets |
| GET | `/api/landing-pages` | List |
| POST | `/api/landing-pages` | Create |
| PUT | `/api/landing-pages/{id}` | Update |
| DELETE | `/api/landing-pages/{id}` | Delete |
| GET | `/api/landing-pages/{id}/export.zip` | Download ZIP |
| GET | `/api/landing-pages/{id}/deploy-preview` | Preview URLs + nginx snippet |
| POST | `/api/landing-pages/{id}/deploy` | SFTP upload to deploy path |

## API doc families (add more anytime)

| API type in form | Partner style | Example |
|------------------|---------------|---------|
| **Gautam · Adpoke** | `adid` + `cmpid` + `token` + `param1` | Palestine Jawwal/Ooredoo |
| **Sanket · GEcmp** | `cid` + full `msisdn` + `ip` + `sessionKey` + `pin` + `redirect` | Georgia Beeline AudioBooks |
| **Zeen Digital** | `cid` + `click_id` + `otp` | Oman Omantel |
| **Custom** | Manual paths | Next new geo |

To add another Sanket/Gautam-style geo later: pick the matching API type, set country + operators (`cid`/`adid`), Export ZIP.


## Notes

- Generated LPs use same-origin PHP proxy (`adpoke-api.php`) for HTTPS → HTTP VAS APIs.
- Propeller LPs also get `propeller-pb.php`.
- Java on this machine may be 17/21; project targets **release 15** as requested.
