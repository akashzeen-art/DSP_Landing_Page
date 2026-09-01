Iraq Asiacell — FunPlus / Gamifya (Advertizer)
==============================================

Folder: LP11_IQ_Aciacll_Advertiser/
UI: FunPlus Step 1/2 (download-ready) — EN/AR language pill
Service: Gamifya (FunPlus UI) | Asiacell Iraq | cid=200
Price: 360 IQD / day
Short code: 2162 | Unsub: 0
PIN: 4 digits
API host: http://143.198.213.74/prod/IQAGcmp/
Redirect: http://143.198.213.74/prod/IQAGcmp/redirect?cid=200&msisdn={msisdn}

Antifraud (iraqcom VMS) — same as LP10_IQ_Aciacll_Prop
--------------------------------------------------------
ChannelID=22796
Page=1 (MSISDN): inject script → antifrauduniqid → sendPIN sessionKey
               mcpuniqid passed on OTP URL (?uniqid=&MSISDN=)
Page=2 (OTP):    inject script → antifrauduniqid → verifyPIN sessionKey
Proxy: asiacell-af.php

API (IQAGcmp)
-------------
sendPIN   ?cid=200&msisdn=&ip=&sessionKey={antifrauduniqid Page1}
verifyPIN ?cid=200&msisdn=&pin=&ip=&sessionKey={antifrauduniqid Page2}
status    ?cid=200&msisdn=
Success: {"response":"SUCCESS","errorMessage":"..."}

MSISDN: Iraq +964, local 10 digits starting with 77 (Asiacell).

Flow
----
index (STEP 1/2 +964 MSISDN + AF Page=1) → sendPIN → STEP 2/2 PIN (AF Page=2)
→ verifyPIN → Advertizer postback → thankyou.html → IQAGcmp redirect

Advertizer postback (after successful PIN verify):
  http://postback.advertizer.com/pb.php?clickid=[[subid]]&txn_id=[[subid]]&amount=[[amount]]&advertiser_id=Zeen1041&key=a5b193ada1cbd22a987bfe876496ac40

  clickid = real [[subid]] from campaign URL (?clickid=)
  amount  = 360

Campaign URL
------------
https://click2funbox.com/LP11_IQ_Aciacll_Advertiser/?clickid=[[subid]]&zoneid={zone_id}

Deploy → click2funbox.com
-------------------------
nginx root: /var/www/vaszeen/zeen_lp/oman

Upload to:
  /var/www/vaszeen/zeen_lp/oman/LP11_IQ_Aciacll_Advertiser/

Live:
  https://click2funbox.com/LP11_IQ_Aciacll_Advertiser/?clickid=[[subid]]&zoneid={zone_id}

1. Create folder oman/LP11_IQ_Aciacll_Advertiser/
2. Upload ALL files from this folder (including assets/)
3. Test PHP: https://click2funbox.com/LP11_IQ_Aciacll_Advertiser/php-test.php
4. Test LP:  https://click2funbox.com/LP11_IQ_Aciacll_Advertiser/?clickid=TEST123

Local test
----------
  python3 serve.py
  http://127.0.0.1:8120/?clickid=TEST123

Files
-----
index.html / thankyou.html / styles.css / script.js
iq-api.php / asiacell-af.php / advertizer-pb.php / php-test.php / serve.py
assets/ …
README-DEPLOY.txt
