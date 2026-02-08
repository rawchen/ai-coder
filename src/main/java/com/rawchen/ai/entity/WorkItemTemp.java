package com.rawchen.ai.entity;

import com.alibaba.fastjson.annotation.JSONField;
import lombok.Data;

/**
 * @author RawChen
 * @date 2024-03-14 18:11
 */
@Data
public class WorkItemTemp {

    @JSONField(name = "name")
    private String name;

    @JSONField(name = "ID")
    private String id;
}
