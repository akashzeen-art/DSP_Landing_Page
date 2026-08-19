Oman Clickadu — StreamPulse UI
==============================

Folder: Oman_clickadu/
UI: Same as Oman Propellar (StreamPulse / Gameonz style)
Integration: Zeen Digital cid=3049 + Clickadu postback

Service
-------
ZD Game — Omantel Oman
cid=3049 | PIN 4 | 0.25 OMR/day
Unsub: UNSUB IVID → 92149
Portal: http://64.225.85.48/adnet/Promo/Api/CPportal?cid=388

Flow
----
index (+968 MSISDN) → sendpin → pin.html → verifypin
→ Clickadu postback → checkstatus → portal

Zeen APIs
---------
sendpin:    http://64.225.85.48/adnet/sendpin?cid=3049&msisdn=...
verifypin:  http://64.225.85.48/adnet/verifypin?cid=3049&msisdn=...&otp=...
checkstatus: http://64.225.85.48/adnet/checkstatus?cid=3049&msisdn=...

Clickadu postback
-----------------
https://sconvtrk.com/conversion/c9a445f69b2775082add794af494a0a289412ae3/?visitor_id=${SUBID}&aid=307904

visitor_id = real Clickadu ${SUBID} from the LP query:
  ?clickid=${SUBID}   or   ?subid={subid}

Fired only after PIN verify success, via clickadu-pb.php (S2S).
Not fired if clickid/subid is missing, ${SUBID}, or a local_ test id.

Campaign URL
------------
https://click2funbox.com/om_clkadu/?clickid=${SUBID}&zoneid={zone_id}

Clickadu traffic source can also use:
https://click2funbox.com/om_clkadu/?subid={subid}

Deploy → click2funbox.com
-------------------------
nginx root: /var/www/vaszeen/zeen_lp/oman

Upload to:
  /var/www/vaszeen/zeen_lp/oman/om_clkadu/

Live:
  https://click2funbox.com/om_clkadu/?clickid=${SUBID}&zoneid={zone_id}

1. Create folder oman/om_clkadu/
2. Upload ALL files from this folder
3. Test PHP: https://click2funbox.com/om_clkadu/php-test.php
4. Test LP:  https://click2funbox.com/om_clkadu/?clickid=TEST123

MSISDN: Oman +968, local 8 digits starting with 7 or 9.
Default language: English (Arabic toggle).

Files
-----
index.html / pin.html / styles.css / assets/
script.js / zeen-api.php / clickadu-pb.php / php-test.php / serve.py
README-DEPLOY.txt
