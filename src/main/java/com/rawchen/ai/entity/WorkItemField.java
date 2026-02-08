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
public class WorkItemField {

    @JSONField(name = "field_type_key")
    private String fieldTypeKey;

    @JSONField(name = "field_alias")
    private String fieldAlias;

    @JSONField(name = "help_description")
    private String helpDescription;

    @JSONField(name = "field_key")
    private String fieldKey;

    @JSONField(name = "field_value")
    private String fieldValue;

    @JSONField(name = "field_name")
    private String fieldName;

    @JSONField(name = "is_custom_field")
    private Boolean isCustomField;

    @JSONField(name = "work_item_scopes")
    private List<String> workItemScopes;

    @JSONField(name = "value_generate_mode")
    private String valueGenerateMode;

    @JSONField(name = "work_item_type_key")
    private String workItemTypeKey;

    @JSONField(name = "options")
    private List<Option> options;

}
