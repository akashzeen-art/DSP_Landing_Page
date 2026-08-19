package com.zeen.lpstudio.domain;

/**
 * VAS API document styles used by different partners.
 * Add a new enum value when a new integration doc family arrives.
 *
 * ADPOKE  = Gautam docs (adid/cmpid/token/param1)
 * ZEEN    = Zeen Digital (cid/click_id/otp)
 * GECMP   = Sanket docs e.g. Georgia Beeline (cid/msisdn+cc/ip/sessionKey/pin/redirect)
 * CUSTOM  = manual paths
 */
public enum ApiProvider {
    ADPOKE,
    ZEEN,
    GECMP,
    CUSTOM
}
