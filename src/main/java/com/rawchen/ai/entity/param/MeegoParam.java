package com.rawchen.ai.entity.param;

import cn.hutool.core.annotation.Alias;
import lombok.Data;
import lombok.experimental.Accessors;

/**
 * @author RawChen
 * @date 2023-11-22 17:39
 */
@Data
@Accessors(chain = true)
public class MeegoParam {

    // 自定义过滤
//    private String filterString;

    /**
     * 数据类型 1工作项列表 2插件工时 3任务工时
     */
    private Integer dataType;

    /**
     * 项目空间KEY
     */
    private String projectKey;

    /**
     * 工作项KEY
     */
    private String typeKey;

    /**
     * 用户KEY
     */
    private String userKey;

    /**
     * 插件ID
     */
    private String pluginId;

    /**
     * 插件秘钥
     */
    private String pluginSecret;

    @Alias("TransactionID")
    private String transactionID;

}
