package com.rawchen.ai.entity.result;

import lombok.Data;

import java.util.List;

/**
 * @author RawChen
 * @date 2023-11-22 14:06
 */
@Data
public class TableMetaResp {

    private String tableName;

    private List<Field> fields;
}
