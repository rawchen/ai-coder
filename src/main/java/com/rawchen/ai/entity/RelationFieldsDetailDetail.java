package com.rawchen.ai.entity;

import com.alibaba.fastjson.annotation.JSONField;
import lombok.Data;

/**
 * @author RawChen
 * @date 2024-04-28 11:14
 */
@Data
public class RelationFieldsDetailDetail {

    @JSONField(name = "story_id")
    private Long storyId;

    @JSONField(name = "work_item_type_key")
    private String workItemTypeKey;

    @JSONField(name = "project_key")
    private String projectKey;
}
