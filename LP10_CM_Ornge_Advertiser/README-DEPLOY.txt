Cameroon Orange — OneGaming (Advertizer)
========================================

Folder: LP10_CM_Ornge_Advertiser/
UI: Theme-496 (same as LP10_IQ_Aciacll_Clkdu) — green Continue, GIF hero
Languages: English (default) + French

Service
-------
Orange — OneGaming — cid=496 — 100 CFA/day — PIN 4
Host: http://159.89.163.174/prod/CMcmp/
Redirect: http://159.89.163.174/prod/CMcmp/redirect?cid=496&msisdn={msisdn}
Antifraud: None

API (CMcmp)
-----------
sendPIN   ?cid=496&msisdn=&ip=
verifyPIN ?cid=496&msisdn=&pin=&ip=
status    ?cid=496&msisdn=
Success: {"response":"SUCCESS","errorMessage":"...","sessionKey":"..."}

MSISDN: Cameroon +237, local 9 digits starting with 6.
(Vendor sample used 241; this LP sends 237 because Country = Cameroon.)

Flow
----
index (+237 MSISDN) → sendPIN → same-page PIN → verifyPIN
→ Advertizer postback → thankyou.html → CMcmp redirect cid=496

Advertizer postback (after successful PIN verify):
  http://postback.advertizer.com/pb.php?clickid=[[subid]]&txn_id=[[subid]]&amount=[[amount]]&advertiser_id=Zeen1041&key=a5b193ada1cbd22a987bfe876496ac40

  clickid = real [[subid]] from campaign URL (?clickid=)
  amount  = 100

Campaign URL
------------
https://click2funbox.com/LP10_CM_Ornge_Advertiser/?clickid=[[subid]]&zoneid={zone_id}

Deploy → click2funbox.com
-------------------------
nginx root: /var/www/vaszeen/zeen_lp/oman

Upload to:
  /var/www/vaszeen/zeen_lp/oman/LP10_CM_Ornge_Advertiser/

Live:
  https://click2funbox.com/LP10_CM_Ornge_Advertiser/?clickid=[[subid]]&zoneid={zone_id}

1. Create folder oman/LP10_CM_Ornge_Advertiser/
2. Upload ALL files from this folder (including assets/)
3. Test PHP: https://click2funbox.com/LP10_CM_Ornge_Advertiser/php-test.php
4. Test LP:  https://click2funbox.com/LP10_CM_Ornge_Advertiser/?clickid=TEST123

Local test
----------
  python3 serve.py
  http://127.0.0.1:8119/?clickid=TEST123

Files
-----
index.html / thankyou.html / styles.css / script.js
zeen-api.php / advertizer-pb.php / php-test.php / serve.py
assets/downloadx.gif / logo_phone.png / subpage.png / loadingtab.gif
README-DEPLOY.txt
