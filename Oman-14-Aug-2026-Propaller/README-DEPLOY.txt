Oman Propeller — StreamPulse UI (14 Aug 2026)
=============================================

Folder: Oman-14-Aug-2026-Propaller/
UI: StreamPulse Lite / Gameonz style (citimob streampulselite)
Integration: same as Oman Propellar (Zeen cid=2203 + PropellerAds)

Service
-------
ZD Gamez — Omantel Oman
cid=2203 | PIN 4 | 0.25 OMR/day
Unsub: UNSUB IVID → 92149
Portal: http://64.225.85.48/adnet/Promo/Api/CPportal?cid=388

Flow
----
index (+968 MSISDN) → sendpin → pin.html → verifypin
→ Propeller postback → checkstatus → portal

Propeller postback
------------------
https://ad.propellerads.com/conversion.php?aid=3898869&pid=&tid=154120&visitor_id=${SUBID}&payout=1
visitor_id = same clickid (${SUBID})

Campaign URL
------------
https://click2funbox.com/oman14prop/?clickid=${SUBID}&zoneid={zone_id}

Deploy → click2funbox.com
-------------------------
nginx root: /var/www/vaszeen/zeen_lp/oman

Upload to:
  /var/www/vaszeen/zeen_lp/oman/oman14prop/

Live:
  https://click2funbox.com/oman14prop/?clickid=${SUBID}&zoneid={zone_id}

1. Create folder oman/oman14prop/
2. Upload ALL files from this folder
3. Test PHP: https://click2funbox.com/oman14prop/php-test.php
4. Test LP:  https://click2funbox.com/oman14prop/?clickid=TEST123

MSISDN: Oman +968, local 8 digits starting with 7 or 9.
Default language: Arabic (English toggle).

Files
-----
index.html / pin.html / styles.css / assets/
script.js / zeen-api.php / propeller-pb.php / php-test.php / serve.py
README-DEPLOY.txt
