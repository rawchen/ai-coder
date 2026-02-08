package com.rawchen.ai.entity;

import com.alibaba.fastjson.annotation.JSONField;
import lombok.Data;
import lombok.experimental.Accessors;

import java.util.List;

/**
 * @author RawChen
 * @date 2024-03-11 09:43
 */
@Data
@Accessors(chain = true)
public class WorkItem {

    @JSONField(name = "id")
    private Long id;

    @JSONField(name = "name")
    private String name;

    @JSONField(name = "project_key")
    private String projectKey;

    @JSONField(name = "work_item_status")
    private WorkItemStatus workItemStatus;

    @JSONField(name = "sub_stage")
    private String subStage;

    @JSONField(name = "created_by")
    private String createdBy;

    @JSONField(name = "updated_by")
    private String updatedBy;

    @JSONField(name = "deleted_by")
    private String deletedBy;

    @JSONField(name = "created_at")
    private Long createdAt;

    @JSONField(name = "updated_at")
    private Long updatedAt;

    @JSONField(name = "deleted_at")
    private Long deletedAt;

    @JSONField(name = "template_id")
    private Long templateId;

    @JSONField(name = "template_type")
    private String templateType;

    @JSONField(name = "work_item_type_key")
    private String workItemTypeKey;

    @JSONField(name = "fields")
    List<WorkItemField> workItemFields;

    @JSONField(name = "relation_fields_detail")
    List<RelationFieldsDetail> relationFieldsDetail;


}
