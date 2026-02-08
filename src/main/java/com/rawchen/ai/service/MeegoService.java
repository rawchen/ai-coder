package com.rawchen.ai.service;

import com.rawchen.ai.entity.*;
import com.rawchen.ai.entity.param.CommonReq;
import com.rawchen.ai.entity.param.MeegoParam;
import com.rawchen.ai.entity.result.R;
import com.rawchen.ai.entity.result.RecordResp;
import com.rawchen.ai.entity.result.TableMetaResp;

import java.util.List;

/**
 * @author RawChen
 * @date 2023-11-22 10:35
 */
public interface MeegoService {

    /**
     * 结构接口
     *
     * @param req
     * @return
     */
    TableMetaResp tableMeta(CommonReq req);

    /**
     * 记录接口
     *
     * @param req
     * @return
     */
    RecordResp records(CommonReq req);

    /**
     * 登录
     *
     * @param meegoParam
     * @return
     */
    R<RecordResp> meegoLogin(MeegoParam meegoParam);

    /**
     * 空间列表
     *
     * @param req
     * @return
     */
    List<SpaceEntity> spaceList(CommonReq req);

    /**
     * 工作项列表
     *
     * @param req
     * @return
     */
    List<ItemEntity> itemList(CommonReq req);

}
