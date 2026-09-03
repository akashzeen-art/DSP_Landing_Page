Iraq Asiacell — Student AI (PropellerAds)
=========================================

Folder: LP10_IO_Aciacll_Prop/
UI: LP10 Theme-496 (same as LP10_KSA_mobly_prop) — AR/EN
Service: Student AI | Asiacell Iraq | cid=3025
Price: 300 IQD / day
Unsub: send 0 to 2019
PIN: 4 digits
API: http://64.225.85.48/adnet/
Portal: http://64.225.85.48/adnet/Promo/Api/CPportal?cid=861

Antifraud (od-integrations provider_script)
-------------------------------------------
carrierId=10009
Page 1 (MSISDN): first_page — inject script, capture AntiFrauduniqid + MCPuniqid
Page 2 (PIN): second_page — #submitterButton gets AFsubmitbtn class, new AntiFrauduniqid
sendpin sessionKey  = AntiFrauduniqid from page 1
verifypin sessionKey = AntiFrauduniqid from page 2
Page 1 MCPuniqid written to URL as ?uniqid=

API (adnet)
-----------
sendpin    ?cid=3025&msisdn=&click_id=&pub_id=&sub_pub_id=&user_ip=&ua=&sessionKey={antiFrauduniqid}
verifypin  ?cid=3025&msisdn=&click_id=&otp=&pub_id=&sub_pub_id=&user_ip=&ua=&sessionKey={antiFrauduniqid}
checkstatus?cid=3025&msisdn=

MSISDN: Iraq +964, local 10 digits starting with 77 (Asiacell).

Flow
----
index (+964 MSISDN, AF page 1) → sendpin → PIN step (AF page 2) → verifypin
→ Propeller postback → thankyou.html → CPportal cid=861

PropellerAds postback (after successful PIN verify):
  https://ad.propellerads.com/conversion.php?aid=3898869&pid=&tid=154120&visitor_id=${SUBID}&payout=300

  visitor_id = real ${SUBID} from campaign URL (?clickid=)
  payout     = 300

Campaign URL
------------
https://click2funbox.com/LP10_IO_Aciacll_Prop/?clickid=${SUBID}&zoneid={zone_id}

Deploy → click2funbox.com
-------------------------
nginx root: /var/www/vaszeen/zeen_lp/oman

Upload to:
  /var/www/vaszeen/zeen_lp/oman/LP10_IO_Aciacll_Prop/

Live:
  https://click2funbox.com/LP10_IO_Aciacll_Prop/?clickid=${SUBID}&zoneid={zone_id}

1. Create folder oman/LP10_IO_Aciacll_Prop/
2. Upload ALL files from this folder (including assets/)
3. Test PHP: https://click2funbox.com/LP10_IO_Aciacll_Prop/php-test.php
4. Test LP:  https://click2funbox.com/LP10_IO_Aciacll_Prop/?clickid=TEST123

Local test
----------
  python3 serve.py
  http://127.0.0.1:8123/?clickid=TEST123

Files
-----
index.html / pin.html / thankyou.html / styles.css / script.js
zeen-api.php / asiacell-af.php / propeller-pb.php / php-test.php / serve.py
assets/downloadx.gif / logo_phone.png / subpage.png / loadingtab.gif
README-DEPLOY.txt
