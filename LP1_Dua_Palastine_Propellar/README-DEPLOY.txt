Palestine Dual Operator Propeller — loaderlite UI
=================================================

Folder: LP1_Dua_Palastine_Propellar/
UI: loaderlite (FileShare / citimob sa loaderlite)
Integration: same as Palastine Dual Operator 12 Aug + PropellerAds

Operators
---------
1) Jawwal  — cid=3008 — portal cid=570 — 1.16 NIS/day — unsub: 0257 → 37799 — PIN 4
2) Ooredoo — cid=3007 — portal cid=569 — 1.5 NIS/day  — unsub: 08 → 6976   — PIN 4

Flow
----
index (+970 MSISDN) → operator.html → sendpin → pin.html → verifypin
→ Propeller postback → thankyou.html → CPportal (operator portal cid)

Propeller postback (after successful PIN verify):
  https://ad.propellerads.com/conversion.php?aid=3898869&pid=&tid=154120&visitor_id=${SUBID}&payout=${PAYOUT}

  visitor_id = same clickid (${SUBID}) from campaign URL
  payout     = 1.16 (Jawwal) or 1.5 (Ooredoo)

Campaign URL
------------
https://click2funbox.com/ps_lp1_dual/?clickid=${SUBID}&zoneid={zone_id}

Deploy → click2funbox.com
-------------------------
nginx root: /var/www/vaszeen/zeen_lp/oman

Upload to:
  /var/www/vaszeen/zeen_lp/oman/ps_lp1_dual/

Live:
  https://click2funbox.com/ps_lp1_dual/?clickid=${SUBID}&zoneid={zone_id}

1. Create folder oman/ps_lp1_dual/
2. Upload ALL files from this folder
3. Test PHP: https://click2funbox.com/ps_lp1_dual/php-test.php
4. Test LP:  https://click2funbox.com/ps_lp1_dual/?clickid=TEST123

MSISDN: Palestine +970, local 9 digits starting with 5.
Default language: Arabic (English toggle).

Local test
----------
  python3 serve.py
  http://127.0.0.1:8089/?clickid=TEST123

Files
-----
index.html / operator.html / pin.html / thankyou.html
styles.css / pict.svg / icon.svg / icn-check.svg / secure.svg
script.js / zeen-api.php / propeller-pb.php / php-test.php / serve.py
README-DEPLOY.txt
