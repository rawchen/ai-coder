package com.rawchen.ai.entity;

import com.alibaba.fastjson.annotation.JSONField;
import lombok.Data;

/**
 * @author RawChen
 * @date 2024-03-14 18:11
 */
@Data
public class ProjectUser {

    @JSONField(name = "user_key")
    private String userKey;

    @JSONField(name = "name_cn")
    private String nameCn;
}
