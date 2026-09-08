Iraq Dual — Korek + Asiacell (PropellerAds)
===========================================

Folder: LP10_IQ_DUAL_PROP/
UI: LP10_IQ_Kork_Adver Theme-496 — AR (default) / EN
Detect: 75 → Korek | 77 → Asiacell
PIN: 4 | MSISDN +964 (10 digits)
pub_id default: propeller
payout: 300

Operators
---------
Korek    cid=3022  portal=326  ZD Know Your Country
  IQD 300/day | Unsub: 0 → 2115
  AF: Evina https://www.digitalapicalls.com/antifraud/Iraq-Korek/Evina
      servicename=KnowYourCountry | merchantname=windowtechnologies | type=pin
      te=#confirm_btn
      ti format: windowtechnologies_{ts}_{32hex}  e.g. windowtechnologies_1788723925_27786659eae7470cb19f4fb11c87fb5b
      verifypin: ti={ti}&ts={ts}&sessionKey={ti}

Asiacell cid=3175  portal=327  ZD Distinguished
  IQD 300/day | Unsub: 0 → 2296
  AF: Shield https://sdp.salasto.dev:2053/Shield/AntiFraud/Prepare/
      ChannelID=22737 | Page=1 (MSISDN) + Page=2 (PIN)
      sendpin/verifypin — AntiFrauduniqid and uniqId MUST be different:
        AntiFrauduniqid / sessionKey = Shield AntiFrauduniqid (page1 send / page2 verify)
        uniqId / fraudCheckToken     = Shield MCPuniqid
        BAD:  AntiFrauduniqid=sskX&uniqId=sskX  (same → OTP Not verified)
        GOOD: AntiFrauduniqid=2026…_31f9…&uniqId=sskb7155…
      confirm_btn class: AFsubmitbtn

API: http://64.225.85.48/adnet/
  sendpin / verifypin / checkstatus

PropellerAds postback (after successful PIN verify):
  https://ad.propellerads.com/conversion.php?aid=3898869&pid=&tid=154120&visitor_id=${SUBID}&payout=${PAYOUT}

  visitor_id = real ${SUBID} from campaign URL (?clickid=)
  payout     = 300

Campaign URL
------------
https://click2funbox.com/LP10_IQ_DUAL_PROP/?clickid=${SUBID}&zoneid={zone_id}

Deploy → click2funbox.com
-------------------------
nginx root: /var/www/vaszeen/zeen_lp/oman

Upload to:
  /var/www/vaszeen/zeen_lp/oman/LP10_IQ_DUAL_PROP/

Live:
  https://click2funbox.com/LP10_IQ_DUAL_PROP/?clickid=${SUBID}&zoneid={zone_id}

1. Create folder oman/LP10_IQ_DUAL_PROP/
2. Upload ALL files (including assets/)
3. Test PHP: https://click2funbox.com/LP10_IQ_DUAL_PROP/php-test.php
4. Test LP:  https://click2funbox.com/LP10_IQ_DUAL_PROP/?clickid=TEST123

Local test
----------
  python3 serve.py
  http://127.0.0.1:8139/?clickid=TEST123

Files
-----
index.html / thankyou.html / styles.css / script.js
zeen-api.php / asiacell-af.php / propeller-pb.php / php-test.php / serve.py
assets/downloadx.gif / logo_phone.png / subpage.png / loadingtab.gif
README-DEPLOY.txt
