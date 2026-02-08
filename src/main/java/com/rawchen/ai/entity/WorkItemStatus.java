package com.rawchen.ai.entity;

import com.alibaba.fastjson.annotation.JSONField;
import lombok.Data;

/**
 * @author RawChen
 * @date 2024-03-11 10:37
 */
@Data
public class WorkItemStatus {

    @JSONField(name = "state_key")
    private String stateKey;

    @JSONField(name = "is_archived_state")
    private Boolean isArchivedState;

    @JSONField(name = "is_init_state")
    private Boolean isInitState;

    @JSONField(name = "updated_at")
    private Long updatedAt;

    @JSONField(name = "updated_by")
    private String updatedBy;
}
