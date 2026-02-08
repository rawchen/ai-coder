package com.rawchen.ai.entity.param;

import cn.hutool.core.annotation.Alias;
import lombok.Data;

/**
 * @author RawChen
 * @date 2023-11-22 16:54
 */
@Data
public class BitCommonContext {

    @Alias("bitable")
    private Bitable bitable;

    @Alias("packID")
    private String packID;

    @Alias("type")
    private String type;

    @Alias("tenantKey")
    private String tenantKey;

    @Alias("userTenantKey")
    private String userTenantKey;

    @Alias("bizInstanceID")
    private String bizInstanceID;

    @Alias("scriptArgs")
    private ScriptArg scriptArg;

}
