package com.rawchen.ai.entity;

import com.alibaba.fastjson.annotation.JSONField;
import lombok.Data;
import lombok.experimental.Accessors;

/**
 * @author RawChen
 * @date 2023-11-28 11:25
 */
@Data
@Accessors(chain = true)
public class ItemEntity {

    @JSONField(name = "is_disable")
    private Integer isDisable;

    @JSONField(name = "api_name")
    private String apiName;

    @JSONField(name = "type_key")
    private String typeKey;

    @JSONField(name = "name")
    private String name;

}
