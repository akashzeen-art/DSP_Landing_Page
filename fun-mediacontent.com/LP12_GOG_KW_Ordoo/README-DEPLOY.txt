Kuwait Ooredoo — Pro max (Google / fun-mediacontent.com)
========================================================

Folder: fun-mediacontent.com/LP12_GOG_KW_Ordoo/
UI: LP12_GOG_UAE CuriousCubs steps (header + lang + phone → PIN page)
Service: Pro max | KW Ooredoo | cid=3149
Price: 800 fils / week
Unsub: UNSUB 5 → 50908
PIN: 4 digits
API: http://64.225.85.48/adnet/
Portal: http://64.225.85.48/adnet/Promo/Api/CPportal?cid=855

MSISDN: Kuwait +965, local 8 digits starting with 5, 6 or 9.
Languages: EN (default) / AR
pub_id default: google

Google Ads (AW-18261487745)
---------------------------
index.html (LP):
  gtag config AW-18261487745
  conversion: AW-18261487745/SpHfCP-v2swcEIHh4INE  (LP_Pageview)

pin.html (OTP / intermediate):
  gtag config AW-18261487745 only

thankyou.html:
  gtag config AW-18261487745
  conversion: AW-18261487745/-XxYCI_Q8cwcEIHh4INE  (Lp-Pageview-Thankyou)

API (adnet)
-----------
sendpin    ?cid=3149&msisdn=&click_id=&pub_id=&sub_pub_id=&user_ip=&ua=&sessionKey=
verifypin  ?cid=3149&msisdn=&click_id=&otp=&pub_id=&sub_pub_id=&user_ip=&ua=&sessionKey=&tid=&ti=
           (+ data[tid] / data[req_id] = same tid from sendpin)

tid flow
--------
sendpin response: tid | ti | sessionKey → stored + passed in pin.html?tid=
verifypin request: tid, ti, sessionKey, data[tid], data[req_id]
checkstatus?cid=3149&msisdn=

Flow
----
index (+965 MSISDN, step 2, LP_Pageview) → sendpin → pin.html (step 3, OTP gtag)
→ verifypin → thankyou.html (TY conversion) → CPportal cid=855

Campaign URL
------------
https://fun-mediacontent.com/LP12_GOG_KW_Ordoo/?clickid={CLICK_ID}

Deploy
------
Server path:
  /var/www/vaszeen/zeen_lp/fun-mediacontent.com/LP12_GOG_KW_Ordoo/

Live:
  https://fun-mediacontent.com/LP12_GOG_KW_Ordoo/?clickid={CLICK_ID}

1. Upload ALL files from this folder (including images/)
2. Test PHP: https://fun-mediacontent.com/LP12_GOG_KW_Ordoo/php-test.php
3. Test LP:  https://fun-mediacontent.com/LP12_GOG_KW_Ordoo/?clickid=TEST123

Local test
----------
  python3 serve.py
  http://127.0.0.1:8128/?clickid=TEST123

Files
-----
index.html / pin.html / thankyou.html / styles.css / script.js
zeen-api.php / php-test.php / serve.py / README-DEPLOY.txt
images/cc-logo.svg / language.svg / kw.svg / arrow-down.svg / pin.svg
