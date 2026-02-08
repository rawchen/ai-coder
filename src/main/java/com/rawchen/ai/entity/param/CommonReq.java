package com.rawchen.ai.entity.param;

import cn.hutool.core.annotation.Alias;
import lombok.Data;

/**
 * @author RawChen
 * @date 2023-11-22 16:24
 */
@Data
public class CommonReq {

    /**
     * datasourceConfig: string，  // 用户在数据源配置页面选择的配置信息，值由开发者定义，Base 服务在请求接口时透传
     * transactionID:string，      // 同步事务 id，获取数据是分页获取，一次同步的多次请求 transactionID 相同
     * pageToken:string，     // 请求首次请求为空，非首次请值为上一次请求返回的 nextPageToken
     * maxPageSize: int，  // 最大可接受的 page_size，返回的记录数需要<=maxPageSize，插件可以根据记录的查询性能来确定返回多少记录。 接口超时时间为 20 秒
     */
    @Alias("params")
    private String params;

    @Alias("context")
    private String context;

}
