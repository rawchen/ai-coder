package com.rawchen.ai.entity.param;

import cn.hutool.core.annotation.Alias;
import lombok.Data;

/**
 * @author RawChen
 * @date 2023-11-22 16:45
 */
@Data
public class BitCommonParam {

    @Alias("datasourceConfig")
    private String datasourceConfig;

    @Alias("pageToken")
    private String pageToken;

    @Alias("maxPageSize")
    private String maxPageSize;

}
