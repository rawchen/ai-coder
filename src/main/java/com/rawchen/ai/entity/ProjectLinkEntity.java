package com.rawchen.ai.entity;

import com.alibaba.fastjson.annotation.JSONField;
import lombok.Data;

/**
 * @author RawChen
 * @date 2024-04-19 16:39
 */
@Data
public class ProjectLinkEntity {

    @JSONField(name = "url")
    private String url;

    @JSONField(name = "name")
    private String name;
}
