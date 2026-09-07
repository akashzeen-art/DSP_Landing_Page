Côte d'Ivoire Orange — 11Barre (PropellerAds)
=============================================

Folder: LP10_CIV_ORNG_PROP/
UI: LP10_CM_Ornge_Prop Theme-496 — EN (default) / FR
Service: 11Barre | Orange Côte d'Ivoire | cid=503
Price: 150 CFA / day
Short code: NA | Unsub: NA
PIN: 4 digits
API host: http://159.89.163.174/prod/CIVOrgcmp/
Redirect: http://159.89.163.174/prod/CIVOrgcmp/redirect?cid=503&msisdn={msisdn}
Antifraud: None

API (CIVOrgcmp)
---------------
sendPIN   ?cid=503&msisdn=&ip=
verifyPIN ?cid=503&msisdn=&pin=&ip=
status    ?cid=503&msisdn=
Success: {"response":"SUCCESS","errorMessage":"..."}

MSISDN: Côte d'Ivoire +225, local 8 digits (doc: 225xxxxxxxx).
Leading 0 is kept (not stripped).

Flow
----
index (+225 MSISDN) → sendPIN → same-page PIN → verifyPIN
→ Propeller postback → thankyou.html → CIVOrgcmp redirect cid=503

PropellerAds postback (after successful PIN verify):
  https://ad.propellerads.com/conversion.php?aid=3898869&pid=&tid=154120&visitor_id=${SUBID}&payout=150

  visitor_id = real ${SUBID} from campaign URL (?clickid=)
  payout     = 150

  (Same Propeller aid/tid as LP10_CM_Ornge_Prop; no separate postback URL was provided.)

Campaign URL
------------
https://click2funbox.com/LP10_CIV_ORNG_PROP/?clickid=${SUBID}&zoneid={zone_id}

Deploy → click2funbox.com
-------------------------
nginx root: /var/www/vaszeen/zeen_lp/oman

Upload to:
  /var/www/vaszeen/zeen_lp/oman/LP10_CIV_ORNG_PROP/

Live:
  https://click2funbox.com/LP10_CIV_ORNG_PROP/?clickid=${SUBID}&zoneid={zone_id}

1. Create folder oman/LP10_CIV_ORNG_PROP/
2. Upload ALL files from this folder (including assets/)
3. Test PHP: https://click2funbox.com/LP10_CIV_ORNG_PROP/php-test.php
4. Test LP:  https://click2funbox.com/LP10_CIV_ORNG_PROP/?clickid=TEST123

Local test
----------
  python3 serve.py
  http://127.0.0.1:8137/?clickid=TEST123

Files
-----
index.html / thankyou.html / styles.css / script.js
zeen-api.php / propeller-pb.php / php-test.php / serve.py
assets/downloadx.gif / logo_phone.png / subpage.png / loadingtab.gif
README-DEPLOY.txt
