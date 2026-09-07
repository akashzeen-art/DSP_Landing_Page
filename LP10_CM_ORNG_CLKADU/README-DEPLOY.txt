Cameroon Orange — OneGaming (Clickadu)
======================================

Folder: LP10_CM_ORNG_CLKADU/
UI: LP10_IQ_Aciacll_Clkdu Theme-496 — EN (default) / FR
Service: OneGaming | Orange Cameroon | cid=502
Price: 100 CFA / day
Short code: NA | Unsub: NA
PIN: 4 digits
API host: http://159.89.163.174/prod/CMcmp/
Redirect: http://159.89.163.174/prod/CMcmp/redirect?cid=502&msisdn={msisdn}

API (CMcmp)
-----------
sendPIN   ?cid=502&msisdn=&ip=
verifyPIN ?cid=502&msisdn=&pin=&ip=
status    ?cid=502&msisdn=
Success: {"response":"SUCCESS","errorMessage":"...","sessionKey":"..."}

MSISDN: Cameroon +237, local 9 digits starting with 6.
(Note: API sample showed 241…; LP uses Cameroon country code 237.)

Flow
----
index (+237 MSISDN) → sendPIN → PIN (same page) → verifyPIN
→ Clickadu postback → thankyou.html → CMcmp redirect cid=502

Clickadu postback (after successful PIN verify):
  http://sconvtrk.com/conversion/c9a445f69b2775082add794af494a0a289412ae3/?visitor_id=${SUBID}&aid=307904

  visitor_id = real ${SUBID} from campaign URL (?clickid= / ?subid=)
  Fired via clickadu-pb.php (S2S). Skipped if clickid is missing, ${SUBID}, or local_*.

Campaign URL
------------
https://click2funbox.com/LP10_CM_ORNG_CLKADU/?clickid=${SUBID}

Deploy → click2funbox.com
-------------------------
nginx root: /var/www/vaszeen/zeen_lp/oman

Upload to:
  /var/www/vaszeen/zeen_lp/oman/LP10_CM_ORNG_CLKADU/

Live:
  https://click2funbox.com/LP10_CM_ORNG_CLKADU/?clickid=${SUBID}

1. Create folder oman/LP10_CM_ORNG_CLKADU/
2. Upload ALL files from this folder (including assets/)
3. Test PHP: https://click2funbox.com/LP10_CM_ORNG_CLKADU/php-test.php
4. Test LP:  https://click2funbox.com/LP10_CM_ORNG_CLKADU/?clickid=TEST123

Local test
----------
  python3 serve.py
  http://127.0.0.1:8136/?clickid=TEST123

Files
-----
index.html / pin.html / thankyou.html / styles.css / script.js
zeen-api.php / clickadu-pb.php / php-test.php / serve.py
assets/downloadx.gif / logo_phone.png / subpage.png / loadingtab.gif
README-DEPLOY.txt
