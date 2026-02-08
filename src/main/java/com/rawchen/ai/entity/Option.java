package com.rawchen.ai.entity;

import com.alibaba.fastjson.annotation.JSONField;
import lombok.Data;

/**
 * @author RawChen
 * @date 2024-03-14 16:55
 */
@Data
public class Option {

    @JSONField(name = "label")
    private String label;

    @JSONField(name = "value")
    private String value;

    @JSONField(name = "work_item_type_key")
    private String workItemTypeKey;
}
