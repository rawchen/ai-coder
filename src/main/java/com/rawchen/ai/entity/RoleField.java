package com.rawchen.ai.entity;

import com.alibaba.fastjson.annotation.JSONField;
import lombok.Data;

/**
 * @author RawChen
 * @date 2024-03-20 10:29
 */
@Data
public class RoleField {

    @JSONField(name = "id")
    private String id;

    @JSONField(name = "name")
    private String name;
}
