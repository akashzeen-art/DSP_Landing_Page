Congo MTN — SelfieStar (PropellerAds)
=====================================

Folder: LP10_mtn_congo_prop/
UI: LP10_LK_Mobitel_Prop Theme-496 — EN/FR
Service: SelfieStar | Congo MTN | cid=19
Price: 150 CFA / week
PIN: 4 digits
Host: http://168.144.122.72/prod/CGcmp/
Redirect: http://168.144.122.72/prod/CGcmp/redirect?cid=19&msisdn={msisdn}

MSISDN: Congo +242, local 06XXXXXXX (9 digits).
API sample: 24206xxxxxxx

API (CGcmp)
-----------
sendPIN   ?cid=19&msisdn=&ip=
verifyPIN ?cid=19&msisdn=&pin=&ip=
status    ?cid=19&msisdn=
Success: {"response":"SUCCESS","errorMessage":"..."}

Flow
----
index (+242 MSISDN) → sendPIN → same-page PIN → verifyPIN
→ Propeller postback → thankyou.html → CGcmp redirect cid=19

PropellerAds postback (after successful PIN verify):
  https://ad.propellerads.com/conversion.php?aid=3898869&pid=&tid=154120&visitor_id=${SUBID}&payout=150

  visitor_id = real ${SUBID} from campaign URL (?clickid=)
  payout     = 150

Campaign URL
------------
https://click2funbox.com/LP10_mtn_congo_prop/?clickid=${SUBID}&zoneid={zone_id}

Deploy → click2funbox.com
-------------------------
nginx root: /var/www/vaszeen/zeen_lp/oman

Upload to:
  /var/www/vaszeen/zeen_lp/oman/LP10_mtn_congo_prop/

Live:
  https://click2funbox.com/LP10_mtn_congo_prop/?clickid=${SUBID}&zoneid={zone_id}

1. Create folder oman/LP10_mtn_congo_prop/
2. Upload ALL files from this folder (including assets/)
3. Test PHP: https://click2funbox.com/LP10_mtn_congo_prop/php-test.php
4. Test LP:  https://click2funbox.com/LP10_mtn_congo_prop/?clickid=TEST123

Local test
----------
  python3 serve.py
  http://127.0.0.1:8132/?clickid=TEST123

Files
-----
index.html / thankyou.html / styles.css / script.js
zeen-api.php / propeller-pb.php / php-test.php / serve.py
assets/ (subpage, logo_phone, loadingtab, downloadx)
README-DEPLOY.txt
