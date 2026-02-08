package com.rawchen.ai.entity.vo;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * @author RawChen
 * @date 2023-11-28 17:22
 */
@Data
public class TenantAuthVo {

    /**
     * ID
     */
    private long id;

    /**
     * 套餐ID
     */
    private long authorizationId;

    /**
     * 租户KEY
     */
    private String tenantKey;

    /**
     * 创建时间
     */
    private LocalDateTime createdAt;

    /**
     * 修改时间
     */
    private LocalDateTime updatedAt;

    /**
     * 剩余天数
     */
    private Long remainDays;

}