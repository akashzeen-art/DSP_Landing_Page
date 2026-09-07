Iraq 2-Operator — Korek + Asiacell (Google / funbox-content.com)
================================================================

Folder: funbox-content.com/LP12_GOG_2Oper_IQ/
UI: LP12_GOG_3Oper_KW CuriousCubs (index → operator → pin → thankyou)
Languages: EN (default) / AR
pub_id default: google

Operators
---------
Korek     cid=3158  portal=916  GameX
  IQD 300 / day | Unsub: 02 → 3999 | PIN 4
  AF: http://apicalling.com/gulfpay/getAfScript?offId=2368 (page=2 PIN only)
  ti → sessionKey on verifypin | ts on OTP URL when present
  If ti empty + script returned: do NOT pass ti/sessionKey from AF

Asiacell  cid=3175  portal=327  ZD Distinguished
  IQD 300 / day | Unsub: 0 → 2296 | PIN 4
  AF: https://sdp.salasto.dev:2053/Shield/AntiFraud/Prepare/
      ChannelID=22737 | Page=1 (MSISDN) + Page=2 (PIN)
  AntiFrauduniqid → sessionKey (page1 sendpin / page2 verifypin)
  MCPuniqid → fraudCheckToken (+ ?uniqid= on OTP URL)
  confirmBtn class: AFsubmitbtn on PIN page

Google Ads (AW-18261554290)
---------------------------
index.html: config + Page_view LYDqCOXB8e4cEPLo5INE
operator.html + pin.html: config only
thankyou.html: config + LP_Thankyou 6ko8CJXU8e4cEPLo5INE

Campaign URL
------------
https://funbox-content.com/LP12_GOG_2Oper_IQ/?clickid={CLICK_ID}

Deploy
------
Server path:
  /var/www/vaszeen/zeen_lp/funbox-content.com/LP12_GOG_2Oper_IQ/

Live:
  https://funbox-content.com/LP12_GOG_2Oper_IQ/?clickid={CLICK_ID}

1. Upload ALL files (including images/)
2. Ensure nginx php-fpm uses php8.3-fpm.sock (same as other funbox sites)
3. Test: https://funbox-content.com/LP12_GOG_2Oper_IQ/php-test.php
4. Test LP: https://funbox-content.com/LP12_GOG_2Oper_IQ/?clickid=TEST123

Local test
----------
  python3 serve.py
  http://127.0.0.1:8135/?clickid=TEST123

Files
-----
index.html / operator.html / pin.html / thankyou.html
styles.css / script.js
zeen-api.php / af-proxy.php / asiacell-af.php / php-test.php / serve.py
images/ (cc-logo, language, iq, arrow-down, pin)
README-DEPLOY.txt
