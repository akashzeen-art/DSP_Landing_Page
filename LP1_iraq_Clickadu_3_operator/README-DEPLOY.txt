Iraq 3-Operator Clickadu — loaderlite UI
========================================

Folder: LP1_iraq_Clickadu_3_operator/
UI: same as LP1_Srilanka_LK_Mobitel_Propellar (loaderlite / FileShare)
Integration: Zeen Digital IQ Korek + Zain + Asiacell + Clickadu postback

Operators
---------
1) Korek    — cid=3073 — portal cid=326 — IQD 300/day — unsub: 0 → 2115  — PIN 4
   Service: ZD Know Your Country
   Antifraud: Evina via digitalapicalls.com (KnowYourCountry / windowtechnologies)
2) Zain     — cid=3074 — portal cid=917 — IQD 400/day — unsub: 94 → 4089 — PIN 5
   Service: GameX
   Antifraud: apicalling.com offId=2369 (page=2 PIN only)
3) Asiacell — cid=3075 — portal cid=915 — IQD 360/day — unsub: 0 → 2348  — PIN 4
   Service: GameX
   Antifraud: apicalling.com offId=2367 (page=1 before sendpin + page=2 PIN)

Flow
----
index (+964 MSISDN) → operator.html → sendpin → pin.html (antifraud)
→ verifypin → Clickadu postback → thankyou.html → CPportal

Clickadu postback (after successful PIN verify):
  http://sconvtrk.com/conversion/c9a445f69b2775082add794af494a0a289412ae3/?visitor_id=${SUBID}&aid=307904

  visitor_id = real ${SUBID} from campaign URL (?clickid=)
  Fired via clickadu-pb.php (S2S). Skipped if clickid is missing, ${SUBID}, or local_*.

Campaign URL
------------
https://click2funbox.com/iq_lp1_clickadu/?clickid=${SUBID}

Deploy → click2funbox.com
-------------------------
nginx root: /var/www/vaszeen/zeen_lp/oman

Upload to:
  /var/www/vaszeen/zeen_lp/oman/iq_lp1_clickadu/

Live:
  https://click2funbox.com/iq_lp1_clickadu/?clickid=${SUBID}

1. Create folder oman/iq_lp1_clickadu/
2. Upload ALL files from this folder
3. Test PHP: https://click2funbox.com/iq_lp1_clickadu/php-test.php
4. Test LP:  https://click2funbox.com/iq_lp1_clickadu/?clickid=TEST123

MSISDN: Iraq +964, local 10 digits starting with 7.
Default language: Arabic (English + Kurdish toggle).

Antifraud
---------
Korek (Evina): PIN page only. Generates ti + ts, injects script, fires DCBProtectRun.
  ti + ts passed on verifypin (sessionKey=ti, ti=ti, ts=ts).

Zain (offId=2369): PIN page only (page=2).
  ti → sessionKey on verifypin. ts → ts on verifypin.
  If ti is empty, it is not sent.

Asiacell (offId=2367): page=1 before sendpin, page=2 on PIN page.
  ti → sessionKey on sendpin and verifypin. ts → ts on verifypin.

Local test
----------
  python3 serve.py
  http://127.0.0.1:8096/?clickid=TEST123

Files
-----
index.html / operator.html / pin.html / thankyou.html
styles.css / pict.svg / icon.svg / icn-check.svg / secure.svg
script.js / zeen-api.php / clickadu-pb.php / af-proxy.php / php-test.php / serve.py
README-DEPLOY.txt
