Iraq Asiacell — FunPlus / Gamifya (PropellerAds)
================================================

Folder: LP9_IQ_Aciacll_Prop/
UI: Theme-340 dark modal (same as LP9_CM_Ornge_Prop) — Watch / Download → MSISDN → PIN
Languages: English (default) + Arabic
Service: Gamifya | Asiacell Iraq | cid=200
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
index (Watch/Download modal +964 MSISDN + AF Page=1) → sendPIN → PIN step (AF Page=2)
→ verifyPIN → Propeller postback → thankyou.html → IQAGcmp redirect

PropellerAds postback (after successful PIN verify):
  https://ad.propellerads.com/conversion.php?aid=3898869&pid=&tid=154120&visitor_id=${SUBID}&payout=360

  visitor_id = real ${SUBID} from campaign URL (?clickid=)
  payout     = 360

Campaign URL
------------
https://click2funbox.com/LP9_IQ_Aciacll_Prop/?clickid=${SUBID}&zoneid={zone_id}

Deploy → click2funbox.com
-------------------------
nginx root: /var/www/vaszeen/zeen_lp/oman

Upload to:
  /var/www/vaszeen/zeen_lp/oman/LP9_IQ_Aciacll_Prop/

Live:
  https://click2funbox.com/LP9_IQ_Aciacll_Prop/?clickid=${SUBID}&zoneid={zone_id}

1. Create folder oman/LP9_IQ_Aciacll_Prop/
2. Upload ALL files from this folder (including assets/)
3. Test PHP: https://click2funbox.com/LP9_IQ_Aciacll_Prop/php-test.php
4. Test LP:  https://click2funbox.com/LP9_IQ_Aciacll_Prop/?clickid=TEST123

Local test
----------
  python3 serve.py
  http://127.0.0.1:8118/?clickid=TEST123

Files
-----
index.html / thankyou.html / styles.css / script.js
iq-api.php / asiacell-af.php / propeller-pb.php / php-test.php / serve.py
assets/ …
README-DEPLOY.txt
