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
public class SpaceEntity {

    @JSONField(name = "simple_name")
    private String simpleName;

    @JSONField(name = "name")
    private String name;

    @JSONField(name = "project_key")
    private String projectKey;

}
