package com.rawchen.ai.entity.result;

import cn.hutool.core.annotation.Alias;
import lombok.Data;

import java.util.List;

/**
 * @author RawChen
 * @date 2023-11-22 14:06
 */
@Data
public class RecordResp {

    @Alias("nextPageToken")
    private String nextPageToken;

    @Alias("hasMore")
    private Boolean hasMore;

    @Alias("records")
    private List<Record> records;
}
