Kuwait 3-Operator — CuriousCubs (Google / fun-mediacontent.com)
===============================================================

Folder: fun-mediacontent.com/LP12_GOG_Kw/
UI: CuriousCubs steps (from LP12_GOG_UAE) + operator select
Domain: https://fun-mediacontent.com
Server: /var/www/vaszeen/zeen_lp/fun-mediacontent.com/LP12_GOG_Kw

Operators (adnet)
-----------------
Ooredoo  cid=3149  portal=855  Pro max   800 fils/week   UNSUB 5 → 50908
Zain     cid=3150  portal=877  Tape      0.075 KWD/day
STC      cid=3151  portal=885  CD        3000 FBf/month  STOP B4 → 50916
PIN: 4 digits for all
API: http://64.225.85.48/adnet/

STC antifraud / Clickstream
---------------------------
- sendpin includes btnid=confirmBtn (PIN verify button id on pin.html)
- On sendpin success: read jsurl from response and inject script into <head>
- Persist sessionKey/ti from sendpin (same value) and pass on verifypin:
    sessionKey, ti, pubid=ZD1, data[req_id]={ti}, data[tid]={ti}
- clkstrm-af.js patches check-pin so empty data[tid] is filled from
  stored ti / get-pin response / data[req_id] (fixes "Empty field tid")
- Hidden #tid / #req_id on operator.html + pin.html
- Re-inject stored jsurl when pin.html loads

MSISDN: Kuwait +965, local 8 digits starting with 5, 6 or 9
Languages: EN (default) / AR
Default pub_id: google

Google Ads (AW-18261487745)
---------------------------
index.html (LP):
  gtag config AW-18261487745
  conversion: AW-18261487745/SpHfCP-v2swcEIHh4INE  (LP_Pageview)

operator.html + pin.html (OTP / intermediate):
  gtag config AW-18261487745 only

thankyou.html:
  gtag config AW-18261487745
  conversion: AW-18261487745/-XxYCI_Q8cwcEIHh4INE  (Lp-Pageview-Thankyou)

Flow
----
index (+965 MSISDN, LP gtag)
→ operator.html (choose Ooredoo / Zain / STC → sendpin)
→ pin.html (OTP gtag → verifypin)
→ thankyou.html → CPportal (855 / 877 / 885)

Campaign URL
------------
https://fun-mediacontent.com/LP12_GOG_Kw/?clickid={CLICK_ID}

Deploy
------
1. Upload ALL files from this folder (including images/)
2. Test PHP: https://fun-mediacontent.com/LP12_GOG_Kw/php-test.php
3. Test LP:  https://fun-mediacontent.com/LP12_GOG_Kw/?clickid=TEST123

Local test
----------
  python3 serve.py
  http://127.0.0.1:8126/?clickid=TEST123

Files
-----
index.html / operator.html / pin.html / thankyou.html
styles.css / script.js / clkstrm-af.js
zeen-api.php / php-test.php / serve.py / README-DEPLOY.txt
images/cc-logo.svg / language.svg / kw.svg / arrow-down.svg / pin.svg / ae.svg
