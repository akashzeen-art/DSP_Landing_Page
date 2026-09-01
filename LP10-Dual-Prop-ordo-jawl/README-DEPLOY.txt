Palestine Dual — Gamify / AIgameopedia (Ooredoo + Jawwal) PropellerAds
======================================================================

Folder: LP10-Dual-Prop-ordo-jawl/
UI: Theme-496 (same as LP10_UAE_Ethsal_Prop) — AR/EN
Service: Gamify (AIgameopedia)
GEO: Palestine (+970)
PIN: 4 digits
Antifraud: None

Operators (Zeentec)
-------------------
1) Ooredoo — id=113 (all APIs) — payout 1.5
2) Jawwal  — id=115 (all APIs) — payout 1.16

API base: https://zeentec.com/pay/
  pingen?id={opId}&msisdn=&ua=&ip=&param1=btn-1&clickid=
  pinver?id={opId}&msisdn=&otp=&ua=&ip=
  checkstatus?id={opId}&msisdn=
  getportal?id={opId}&msisdn=

IMPORTANT: Same operator id is used for EVERY API (pingen / pinver /
checkstatus / getportal). Ooredoo=113, Jawwal=115.
Publisher payout blank in doc — Propeller uses 1.5 / 1.16.

MSISDN: Palestine +970, local 9 digits starting with 5.

Flow
----
index (+970 MSISDN) → choose Ooredoo/Jawwal → pingen → PIN → pinver
→ Propeller postback → thankyou.html → getportal?id={same op id}

PropellerAds postback (after successful PIN verify):
  https://ad.propellerads.com/conversion.php?aid=3898869&pid=&tid=154120&visitor_id=${SUBID}&payout=${PAYOUT}

  visitor_id = real ${SUBID} from campaign URL (?clickid=)
  payout     = 1.5 (Ooredoo) or 1.16 (Jawwal)

Campaign URL
------------
https://click2funbox.com/LP10-Dual-Prop-ordo-jawl/?clickid=${SUBID}&zoneid={zone_id}

Deploy → click2funbox.com
-------------------------
nginx root: /var/www/vaszeen/zeen_lp/oman

Upload to:
  /var/www/vaszeen/zeen_lp/oman/LP10-Dual-Prop-ordo-jawl/

Live:
  https://click2funbox.com/LP10-Dual-Prop-ordo-jawl/?clickid=${SUBID}&zoneid={zone_id}

1. Create folder oman/LP10-Dual-Prop-ordo-jawl/
2. Upload ALL files from this folder (including assets/)
3. Test PHP: https://click2funbox.com/LP10-Dual-Prop-ordo-jawl/php-test.php
4. Test LP:  https://click2funbox.com/LP10-Dual-Prop-ordo-jawl/?clickid=TEST123

Local test
----------
  python3 serve.py
  http://127.0.0.1:8115/?clickid=TEST123

Files
-----
index.html / thankyou.html / styles.css / script.js
zeen-api.php / propeller-pb.php / php-test.php / serve.py
assets/downloadx.gif / logo_phone.png / subpage.png / loadingtab.gif
README-DEPLOY.txt
