Iraq Asiacell — Gamifya (Advertizer)
=====================================

Folder: LP9_Iq_Asacll_Adver/
UI: Theme-340 (LP9) — Watch / Download → MSISDN → PIN
Languages: English (default) + Arabic

Service: Gamifya | Asiacell Iraq | cid=224
Price: 360 IQD / day
Short code: 2162 | Unsub: 0
PIN: 4 digits
API host: http://143.198.213.74/prod/IQAGcmp/
Redirect: http://143.198.213.74/prod/IQAGcmp/redirect?cid=224&msisdn={msisdn}

Antifraud (iraqcom VMS)
-----------------------
ChannelID=22796
Page=1 (MSISDN): inject script → antifrauduniqid → sendPIN sessionKey
               mcpuniqid passed on OTP URL (?uniqid=&MSISDN=)
Page=2 (OTP):    inject script → antifrauduniqid → verifyPIN sessionKey
Proxy: asiacell-af.php

API (IQAGcmp)
-------------
sendPIN   ?cid=224&msisdn=&ip=&sessionKey={antifrauduniqid Page1}
verifyPIN ?cid=224&msisdn=&pin=&ip=&sessionKey={antifrauduniqid Page2}
status    ?cid=224&msisdn=
Success: {"response":"SUCCESS","errorMessage":"..."}

MSISDN: Iraq +964, local 10 digits starting with 77 (Asiacell).

Flow
----
index (Watch/Download modal +964 MSISDN + AF Page=1) → sendPIN → PIN step (AF Page=2)
→ verifyPIN → Advertizer postback → thankyou.html → IQAGcmp redirect

Advertizer postback (after successful PIN verify):
  http://postback.advertizer.com/pb.php?clickid=[[subid]]&txn_id=[[subid]]&amount=1&advertiser_id=Zeen1041&key=a5b193ada1cbd22a987bfe876496ac40

  clickid = real [[subid]] from campaign URL
  txn_id  = same as clickid
  amount  = 1

  Fired once via advertizer-pb.php (S2S). Skipped if clickid is missing or local_*.

Campaign URL
------------
https://click2funbox.com/LP9_Iq_Asacll_Adver/?clickid=[[subid]]&zoneid={zone_id}

Deploy → click2funbox.com
-------------------------
nginx root: /var/www/vaszeen/zeen_lp/oman

Upload to:
  /var/www/vaszeen/zeen_lp/oman/LP9_Iq_Asacll_Adver/

Live:
  https://click2funbox.com/LP9_Iq_Asacll_Adver/?clickid=[[subid]]&zoneid={zone_id}

1. Create folder oman/LP9_Iq_Asacll_Adver/
2. Upload ALL files from this folder (including assets/)
3. Test PHP: https://click2funbox.com/LP9_Iq_Asacll_Adver/php-test.php
4. Test LP:  https://click2funbox.com/LP9_Iq_Asacll_Adver/?clickid=TEST123

Local test
----------
  python3 serve.py
  http://127.0.0.1:8123/?clickid=TEST123

Files
-----
index.html / thankyou.html / styles.css / script.js
iq-api.php / asiacell-af.php / advertizer-pb.php / php-test.php / serve.py
assets/ (subpage.png, player.svg, bars, fonts, mov.jpg, hd.png, …)
README-DEPLOY.txt
