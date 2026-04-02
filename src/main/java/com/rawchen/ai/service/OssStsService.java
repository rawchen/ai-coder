package com.rawchen.ai.service;

import com.rawchen.ai.entity.vo.StsTokenVO;

/**
 * @author RawChen
 * @date 2026-04-02 10:53
 */
public interface OssStsService {

    StsTokenVO getStsToken();

    String buildPolicy();
}
