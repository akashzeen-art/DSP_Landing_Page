Cameroon Orange — OneGaming (Advertizer)
========================================

Folder: LP10_CM_Orng_Adver/
UI: Theme-496 (same as LP10_CM_Ornge_Prop) — green Continue, GIF hero
Languages: English (default) + French
Domain: https://click2funbox.com

Service
-------
Orange — OneGaming — cid=500 — 100 CFA/day — PIN 4
Host: http://159.89.163.174/prod/CMcmp/
Redirect: http://159.89.163.174/prod/CMcmp/redirect?cid=500&msisdn={msisdn}
Antifraud: None

API (CMcmp)
-----------
sendPIN   ?cid=500&msisdn=&ip=
verifyPIN ?cid=500&msisdn=&pin=&ip=
status    ?cid=500&msisdn=
Success: {"response":"SUCCESS","errorMessage":"...","sessionKey":"..."}

MSISDN: Cameroon +237, local 9 digits starting with 6.
(Vendor sample used 241; this LP sends 237 because Country = Cameroon.)

Flow
----
index (+237 MSISDN) → sendPIN → same-page PIN → verifyPIN
→ Advertizer postback → thankyou.html → CMcmp redirect cid=500

Advertizer postback (after successful PIN verify):
  http://postback.advertizer.com/pb.php?clickid={clickid}&txn_id={clickid}&amount=1&advertiser_id=Zeen1041&key=a5b193ada1cbd22a987bfe876496ac40

  clickid = real [[subid]] from campaign URL (?clickid=)
  amount  = 1

Campaign URL
------------
https://click2funbox.com/LP10_CM_Orng_Adver/?clickid=[[subid]]

Deploy → click2funbox.com
-------------------------
nginx root: /var/www/vaszeen/zeen_lp/oman

Upload to:
  /var/www/vaszeen/zeen_lp/oman/LP10_CM_Orng_Adver/

Live:
  https://click2funbox.com/LP10_CM_Orng_Adver/?clickid=[[subid]]

1. Create folder oman/LP10_CM_Orng_Adver/
2. Upload ALL files from this folder (including assets/)
3. Test PHP: https://click2funbox.com/LP10_CM_Orng_Adver/php-test.php
4. Test LP:  https://click2funbox.com/LP10_CM_Orng_Adver/?clickid=TEST123

Local test
----------
  python3 serve.py
  http://127.0.0.1:8118/?clickid=TEST123

Files
-----
index.html / thankyou.html / styles.css / script.js
zeen-api.php / advertizer-pb.php / php-test.php / serve.py
assets/downloadx.gif / logo_phone.png / subpage.png / loadingtab.gif
README-DEPLOY.txt
