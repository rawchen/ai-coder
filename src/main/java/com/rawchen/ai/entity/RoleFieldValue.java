package com.rawchen.ai.entity;

import com.alibaba.fastjson.annotation.JSONField;
import lombok.Data;

import java.util.List;

/**
 * @author RawChen
 * @date 2024-03-20 10:29
 */
@Data
public class RoleFieldValue {

    @JSONField(name = "role")
    private String role;

    @JSONField(name = "owners")
    private List<String> owners;
}
