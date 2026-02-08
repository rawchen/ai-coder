package com.rawchen.ai.service;

/**
 * @author RawChen
 * @date 2023-11-28 18:39
 */
public interface TenantAuthService {


    /**
     * 租户KEY判断租户能用的行数
     *
     * @param tenantKey
     * @return
     */
    Long rowNumberLimit(String tenantKey);

}
