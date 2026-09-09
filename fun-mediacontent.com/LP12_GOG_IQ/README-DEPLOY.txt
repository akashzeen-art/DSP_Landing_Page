Iraq 3-Operator GameX (Google / fun-mediacontent.com)
=====================================================

Folder: fun-mediacontent.com/LP12_GOG_IQ/
UI: CuriousCubs steps (from LP12_GOG_Kw) + operator select
Domain: https://fun-mediacontent.com
Server: /var/www/vaszeen/zeen_lp/fun-mediacontent.com/LP12_GOG_IQ

Operators (adnet)
-----------------
Zain     cid=3157  portal=917  GameX  IQD 400/day  unsub 94 → 4089  PIN 5
         AF offId=2369  page=2 (PIN only)
Korek    cid=3158  portal=916  GameX  IQD 300/day  unsub 02 → 3999  PIN 4
         AF offId=2368  page=2 (PIN only)
Asiacell cid=3159  portal=915  GameX  IQD 360/day  unsub 0 → 2348   PIN 4
         AF offId=2367  page=1 (MSISDN) + page=2 (PIN)

API: http://64.225.85.48/adnet/
AF:  http://apicalling.com/gulfpay/getAfScript

MSISDN: Iraq +964, local 10 digits starting with 7
  77… Asiacell | 78/79… Zain | 75… Korek
Languages: EN (default) / AR
Default pub_id: google

Antifraud
----------
- Headers: JSON → Base64
- buttonid: evina_ctabutton (page 1) / confirmBtn (page 2)
- ti → sessionKey + transactionId + ti on verifypin (and sendpin for Asiacell when ti present)
- If ti empty but script returned: do NOT pass ti/sessionKey from AF
- AF ts value → pin.html?uniqid={ts} (param name uniqid, value = AF ts) + API ts/uniqid params
- Asiacell page=1 script loads on MSISDN page when 77… number is complete (not only on submit)
- Proxy: af-proxy.php (HTTP AF from HTTPS LP)

Google Ads (AW-18261487745)
---------------------------
index.html (LP):
  gtag config + conversion SpHfCP-v2swcEIHh4INE

operator.html + pin.html (OTP / intermediate):
  gtag config only

thankyou.html:
  gtag config + conversion -XxYCI_Q8cwcEIHh4INE

Flow
----
index (+964 MSISDN; Asiacell runs AF page=1)
→ operator.html (choose op → sendpin)
→ pin.html?ts=… (AF page=2 → verifypin)
→ thankyou.html → CPportal (917 / 916 / 915)

Campaign URL
------------
https://fun-mediacontent.com/LP12_GOG_IQ/?clickid={CLICK_ID}

Deploy
------
1. Upload ALL files (including images/ + af-proxy.php)
2. Test PHP: https://fun-mediacontent.com/LP12_GOG_IQ/php-test.php
3. Test LP:  https://fun-mediacontent.com/LP12_GOG_IQ/?clickid=TEST123

Local test
----------
  python3 serve.py
  http://127.0.0.1:8127/?clickid=TEST123

Files
-----
index.html / operator.html / pin.html / thankyou.html
styles.css / script.js
zeen-api.php / af-proxy.php / php-test.php / serve.py / README-DEPLOY.txt
images/cc-logo.svg / language.svg / iq.svg / arrow-down.svg / pin.svg
