Iraq 3-Operator PropellerAds — movstreamlite UI
================================================

Folder: LP3_Iraq_IQ_3op_Propellar/
UI: movstreamlite (Watch Now / video frame)
Integration: Zeen Digital 3 operators + PropellerAds postback

Operators
---------
1) Korek    — cid=3022 — portal cid=326 — IQD 300/day — unsub: 0 → 2115   — PIN 4
   Antifraud: Evina via digitalapicalls.com (KnowYourCountry / windowtechnologies)
2) Zain     — cid=3070 — portal cid=917 — IQD 400/day — unsub: 94 → 4089  — PIN 5
   Antifraud: apicalling.com offId=2369 (page=2 PIN only)
3) Asiacell — cid=3069 — portal cid=915 — IQD 360/day — unsub: 0 → 2348   — PIN 4
   Antifraud: apicalling.com offId=2367 (page=1 MSISDN + page=2 PIN)

Flow
----
index (+964 MSISDN) → operator.html (choose op) → sendpin
  → pin.html (antifraud + PIN) → verifypin
  → PropellerAds postback → thankyou.html → CPportal

PropellerAds postback (after successful PIN verify):
  https://ad.propellerads.com/conversion.php?aid=3898869&pid=&tid=154120&visitor_id={clickid}&payout={payout}

  visitor_id = real ${SUBID} from campaign URL
  payout     = 0.25 (all operators)

Campaign URL
------------
https://click2funbox.com/iq_lp3_prop/?clickid=${SUBID}&zoneid={zone_id}

Deploy → click2funbox.com
-------------------------
nginx root: /var/www/vaszeen/zeen_lp/oman

Upload to:
  /var/www/vaszeen/zeen_lp/oman/iq_lp3_prop/

Live:
  https://click2funbox.com/iq_lp3_prop/?clickid=${SUBID}&zoneid={zone_id}

1. Create folder oman/iq_lp3_prop/
2. Upload ALL files from this folder (including assets/)
3. Test PHP: https://click2funbox.com/iq_lp3_prop/php-test.php
4. Test LP:  https://click2funbox.com/iq_lp3_prop/?clickid=TEST123

MSISDN: Iraq +964, local 10 digits starting with 7.
Default language: Arabic (English + Kurdish toggle).

Antifraud Notes
---------------
Korek (Evina):
  - Runs on PIN page load only
  - Generates ti + ts, fetches script from digitalapicalls.com
  - ti passed as sessionKey to verifypin
  - ts passed as ts parameter to verifypin

Zain (apicalling.com offId=2369):
  - Antifraud on PIN page only (page=2)
  - ti from response → sessionKey for verifypin
  - ts from response → ts for verifypin

Asiacell (apicalling.com offId=2367):
  - Page=1 on MSISDN page (index #confirm_btn) when number starts with 77
    (prefetch on 10 digits + required on submit; script must load before leave)
  - Page=1 retry on operator if page1/ti missing
  - Page=2 on PIN page (#confirm_btn)
  - AF ti → transactionId (+ sessionKey) on BOTH sendpin and verifypin
  - ts appended to pin.html?ts=… and verifypin
  - All Zeen calls: GET

Local test
----------
  python3 serve.py
  http://127.0.0.1:8095/?clickid=TEST123

Files
-----
index.html / operator.html / pin.html / thankyou.html
styles.css / assets/ (hd.png, mov.jpg, leftbar.png, rightbar.png, fonts.css)
script.js / zeen-api.php / propeller-pb.php / af-proxy.php / php-test.php / serve.py
README-DEPLOY.txt
