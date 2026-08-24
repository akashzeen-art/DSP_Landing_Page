Cameroon Orange — OneGaming (PropellerAds)
==========================================

Folder: LP9_CM_Ornge_Prop/
UI: Theme 340 dark modal (same as LP9_Onck_MTN_Prop) — Watch / Download → MSISDN → PIN
Languages: English (default) + French

Service
-------
Orange — OneGaming — cid=496 — 100 CFA/day — PIN 4
Host: http://159.89.163.174/prod/CMcmp/
Redirect: http://159.89.163.174/prod/CMcmp/redirect?cid=496&msisdn={msisdn}

API (CMcmp, not Zeen adnet)
---------------------------
sendPIN   ?cid=496&msisdn=&ip=
verifyPIN ?cid=496&msisdn=&pin=&ip=
status    ?cid=496&msisdn=
Success: {"response":"SUCCESS","errorMessage":"...","sessionKey":"..."}

MSISDN: Cameroon +237, local 9 digits starting with 6.
(Vendor sample used 241; this LP sends 237 because Country = Cameroon.)

Flow
----
index (modal +237 MSISDN) → sendPIN → PIN → verifyPIN
→ Propeller postback → thankyou.html → CMcmp redirect cid=496

PropellerAds postback (after successful PIN verify):
  https://ad.propellerads.com/conversion.php?aid=3898869&pid=&tid=154120&visitor_id=${SUBID}&payout=100

  visitor_id = real ${SUBID} from campaign URL (?clickid=)
  payout     = 100

Campaign URL
------------
https://click2funbox.com/LP9_CM_Ornge_Prop/?clickid=${SUBID}&zoneid={zone_id}

Deploy → click2funbox.com
-------------------------
nginx root: /var/www/vaszeen/zeen_lp/oman

Upload to:
  /var/www/vaszeen/zeen_lp/oman/LP9_CM_Ornge_Prop/

Live:
  https://click2funbox.com/LP9_CM_Ornge_Prop/?clickid=${SUBID}&zoneid={zone_id}

1. Create folder oman/LP9_CM_Ornge_Prop/
2. Upload ALL files from this folder (including assets/)
3. Test PHP: https://click2funbox.com/LP9_CM_Ornge_Prop/php-test.php
4. Test LP:  https://click2funbox.com/LP9_CM_Ornge_Prop/?clickid=TEST123

Local test
----------
  python3 serve.py
  http://127.0.0.1:8112/?clickid=TEST123

Files
-----
index.html / thankyou.html / styles.css / script.js
zeen-api.php / propeller-pb.php / php-test.php / serve.py
assets/ (logo, player, bars, fonts, etc.)
README-DEPLOY.txt
