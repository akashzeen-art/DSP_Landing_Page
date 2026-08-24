Iraq Asiacell — Gamifya (Clickadu)
==================================

Folder: LP10_IQ_Aciacll_Clkdu/
UI: Theme-496 (same as LP10_KSA_mobly_prop) — AR/EN
Service: Gamifya | Asiacell Iraq | cid=200
Price: 360 IQD / day
Short code: 2162 | Unsub: 0
PIN: 4 digits
API host: http://143.198.213.74/prod/IQAGcmp/
Redirect: http://143.198.213.74/prod/IQAGcmp/redirect?cid=200&msisdn={msisdn}

Antifraud (iraqcom VMS)
------------------------
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
index (+964 MSISDN + AF Page=1) → sendPIN → PIN step (AF Page=2)
→ verifyPIN → Clickadu postback → thankyou.html → IQAGcmp redirect

Clickadu postback (after successful PIN verify):
  http://sconvtrk.com/conversion/c9a445f69b2775082add794af494a0a289412ae3/?visitor_id=${SUBID}&aid=307904

  visitor_id = real ${SUBID} from campaign URL (?clickid= / ?subid=)
  Fired via clickadu-pb.php (S2S). Skipped if clickid is missing, ${SUBID}, or local_*.

Campaign URL
------------
https://click2funbox.com/LP10_IQ_Aciacll_Clkdu/?clickid=${SUBID}

Deploy → click2funbox.com
-------------------------
nginx root: /var/www/vaszeen/zeen_lp/oman

Upload to:
  /var/www/vaszeen/zeen_lp/oman/LP10_IQ_Aciacll_Clkdu/

Live:
  https://click2funbox.com/LP10_IQ_Aciacll_Clkdu/?clickid=${SUBID}

1. Create folder oman/LP10_IQ_Aciacll_Clkdu/
2. Upload ALL files from this folder (including assets/)
3. Test PHP: https://click2funbox.com/LP10_IQ_Aciacll_Clkdu/php-test.php
4. Test LP:  https://click2funbox.com/LP10_IQ_Aciacll_Clkdu/?clickid=TEST123

Local test
----------
  python3 serve.py
  http://127.0.0.1:8114/?clickid=TEST123

Files
-----
index.html / pin.html / thankyou.html / styles.css / script.js
iq-api.php / asiacell-af.php / clickadu-pb.php / php-test.php / serve.py
assets/downloadx.gif / logo_phone.png / subpage.png / loadingtab.gif
README-DEPLOY.txt
