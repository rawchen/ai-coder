package com.rawchen.ai.entity;

import com.alibaba.fastjson.annotation.JSONField;
import lombok.Data;

import java.util.List;

/**
 * @author RawChen
 * @date 2024-04-28 11:12
 */
@Data
public class RelationFieldsDetail {

    @JSONField(name = "field_key")
    private String fieldKey;

    @JSONField(name = "detail")
    private List<RelationFieldsDetailDetail> detail;

}
