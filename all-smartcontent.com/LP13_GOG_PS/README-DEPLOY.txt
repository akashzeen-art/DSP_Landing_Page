Palestine — Gamify / AIgameopedia (Google / all-smartcontent.com)
=================================================================

Folder: all-smartcontent.com/LP13_GOG_PS/
UI: LP13_GOG_UAE light theme — EN / AR
Service: Gamify (AIgameopedia)
GEO: Palestine (+970)
PIN: 4
Antifraud: None
API: https://zeentec.com/pay/

Offers / IDs (from docs)
-----------------------
pingen Offer A  id=116  (+ ua, ip, param1=msisdnBtn, clickid)
pingen Offer B  id=117  (+ ua, ip, param1=msisdnBtn, clickid)
pinver          id=111
checkstatus     id=111
getportal       id=111

Note: Docs also showed checkstatus/getportal samples with id=180;
Required Details Service ID / Portal URL use id=111 — LP uses 111.

MSISDN: +970, local 9 digits starting with 5.

Flow
----
index → choose Offer A (116) or B (117) → pingen → PIN → pinver (111)
→ thankyou (Google Thank_You) → getportal?id=111&msisdn=

Google Ads (AW-18322603599)
---------------------------
index.html: gtag config
thankyou.html: gtag config + conversion O9ZpCK-B-PEcEM_88qBE

Campaign URL
------------
https://all-smartcontent.com/LP13_GOG_PS/?clickid={clickid}

Deploy
------
Server:
  /var/www/vaszeen/zeen_lp/all-smartcontent.com/LP13_GOG_PS/

FileZilla (SFTP):
  Host 160.187.80.197  Port 5550  User root
  Upload this folder into the path above.

Live:
  https://all-smartcontent.com/LP13_GOG_PS/?clickid=TEST123
  https://all-smartcontent.com/LP13_GOG_PS/php-test.php

Local:
  python3 serve.py
  http://127.0.0.1:8141/?clickid=TEST123

Files
-----
index.html / thankyou.html / styles.css / script.js
zeen-api.php / php-test.php / serve.py
images/logo.svg (+ optional c-*.svg)
README-DEPLOY.txt
