Kuwait 3-Operator PropellerAds — loaderlite UI
==============================================

Folder: LP1_kw_Prop/
UI: same as LP1_Srilanka_LK_Mobitel_Propellar (loaderlite / FileShare)
Integration: Zeen Digital KW Zain + STC + Ooredoo + PropellerAds

Operators
---------
1) Zain    — cid=3078 — portal cid=926 — Zuppykids — unsub: Unsub MK → 95452 — PIN 4
2) STC     — cid=3079 — portal cid=927 — mystrycenter 200 fils/day — unsub: Stop 2 → 51123 — PIN 4
   Antifraud on OTP page:
     http://40.172.132.15/kwstc/mystrycenter/antifraud.php?msisdn=@MSISDN&pp=daily_ft&userip=@USERIP&headers=@BASE64
3) Ooredoo — cid=3080 — portal cid=928 — CELEBDAIRY KWD 0.8/week — shortcode 92761 — PIN 4

Flow
----
index (+965 MSISDN) → operator.html → sendpin → pin.html (STC antifraud)
→ verifypin → Propeller postback → thankyou.html → CPportal

PropellerAds postback (after successful PIN verify):
  https://ad.propellerads.com/conversion.php?aid=3898869&pid=&tid=154120&visitor_id=${SUBID}&payout=${PAYOUT}

  visitor_id = real ${SUBID} from campaign URL (?clickid=)
  payout     = 0.2 (Zain / STC) or 0.8 (Ooredoo)

Campaign URL
------------
https://click2funbox.com/kw_lp1_prop/?clickid=${SUBID}&zoneid={zone_id}

Deploy → click2funbox.com
-------------------------
nginx root: /var/www/vaszeen/zeen_lp/oman

Upload to:
  /var/www/vaszeen/zeen_lp/oman/kw_lp1_prop/

Live:
  https://click2funbox.com/kw_lp1_prop/?clickid=${SUBID}&zoneid={zone_id}

1. Create folder oman/kw_lp1_prop/
2. Upload ALL files from this folder
3. Test PHP: https://click2funbox.com/kw_lp1_prop/php-test.php
4. Test LP:  https://click2funbox.com/kw_lp1_prop/?clickid=TEST123

MSISDN: Kuwait +965, local 8 digits starting with 5, 6 or 9.
Default language: Arabic (English toggle).

Local test
----------
  python3 serve.py
  http://127.0.0.1:8097/?clickid=TEST123

Files
-----
index.html / operator.html / pin.html / thankyou.html
styles.css / pict.svg / icon.svg / icn-check.svg / secure.svg
script.js / zeen-api.php / propeller-pb.php / af-proxy.php / php-test.php / serve.py
README-DEPLOY.txt
