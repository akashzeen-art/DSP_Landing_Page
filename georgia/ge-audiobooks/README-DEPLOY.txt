Georgia Beeline — AudioBooks
============================

Domain:   ge-playcontent.com
Folder:   ge-audiobooks
Service:  AudioBooks
Country:  Georgia
Operator: Beeline · cid=489 · 1 GEL / day
PIN:      4 digits
API:      GEcmp sendPIN / verifyPIN / status / redirect

Campaign URL:
  https://ge-playcontent.com/ge-audiobooks/?clickid={gclid}

Flow (same as Palestine G01 pattern)
------------------------------------
1. Enter mobile (local 9 digits starting with 5 → msisdn=995XXXXXXXX)
2. Continue → sendPIN?cid=489&msisdn=995…&ip= → save sessionKey → PIN page
3. Confirm → verifyPIN?cid=&msisdn=&pin=&ip=&sessionKey=
4. status?cid=&msisdn=
5. thankyou.html (Thank_You conversion) → ge-api.php?path=redirect → portal

Upstream
--------
http://159.89.163.174/prod/GEcmp/sendPIN
http://159.89.163.174/prod/GEcmp/verifyPIN
http://159.89.163.174/prod/GEcmp/status
http://159.89.163.174/prod/GEcmp/redirect

Deploy (FileZilla)
------------------
Upload ALL files to:
  /var/www/vaszeen/zeen_lp/gorgia/ge-audiobooks/

Required:
  index.html
  thankyou.html
  script.js
  styles.css
  ge-api.php
  php-test.php

Test PHP:
  https://ge-playcontent.com/ge-audiobooks/php-test.php
  → "PHP is working"

Ads tags (AW)
-------------
ID: AW-18322602807
Page_view: AW-18322602807/yc_XCILH69ccELf28qBE
Thank_You: AW-18322602807/2UsOCIXH8tccELf28qBE
