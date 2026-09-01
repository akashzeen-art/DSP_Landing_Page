Palestine Dual Operator — Z Game (PropellerAds)
===============================================

Folder: LP9_Dual_Palstn_Prop/
UI: Theme 340 dark modal (same as LP9_CM_Ornge_Prop) — Watch / Download → MSISDN → operator → PIN
Languages: Arabic (default) + English

Operators
---------
1) Jawwal  — cid=3008 — portal cid=570 — 1.16 NIS/day — unsub: 0257 → 37799 — PIN 4
2) Ooredoo — cid=3007 — portal cid=569 — 1.5 NIS/day  — unsub: 08 → 6976   — PIN 4

API: http://64.225.85.48/adnet/ (sendpin / verifypin)

Flow
----
index (modal +970 MSISDN) → choose Jawwal/Ooredoo → sendpin → PIN → verifypin
→ Propeller postback → thankyou.html → CPportal (operator portal cid)

PropellerAds postback (after successful PIN verify):
  https://ad.propellerads.com/conversion.php?aid=3898869&pid=&tid=154120&visitor_id=${SUBID}&payout=${PAYOUT}

  visitor_id = real ${SUBID} from campaign URL (?clickid=)
  payout     = 1.16 (Jawwal) or 1.5 (Ooredoo)

Campaign URL
------------
https://click2funbox.com/LP9_Dual_Palstn_Prop/?clickid=${SUBID}&zoneid={zone_id}

Deploy → click2funbox.com
-------------------------
nginx root: /var/www/vaszeen/zeen_lp/oman

Upload to:
  /var/www/vaszeen/zeen_lp/oman/LP9_Dual_Palstn_Prop/

Live:
  https://click2funbox.com/LP9_Dual_Palstn_Prop/?clickid=${SUBID}&zoneid={zone_id}

1. Create folder oman/LP9_Dual_Palstn_Prop/
2. Upload ALL files from this folder (including assets/)
3. Test PHP: https://click2funbox.com/LP9_Dual_Palstn_Prop/php-test.php
4. Test LP:  https://click2funbox.com/LP9_Dual_Palstn_Prop/?clickid=TEST123

MSISDN: Palestine +970, local 9 digits starting with 5.

Local test
----------
  python3 serve.py
  http://127.0.0.1:8090/?clickid=TEST123

Files
-----
index.html / thankyou.html / styles.css / script.js
zeen-api.php / propeller-pb.php / php-test.php / serve.py
assets/ (logo, player, bars, fonts, etc.)
README-DEPLOY.txt
