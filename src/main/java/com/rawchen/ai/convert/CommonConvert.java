package com.rawchen.ai.convert;

import com.rawchen.ai.entity.param.CustomParam;
import com.rawchen.ai.entity.param.MeegoParam;
import org.mapstruct.Mapper;
import org.mapstruct.factory.Mappers;

/**
 * @author RawChen
 * @date 2023-11-24 13:57
 */
@Mapper
public interface CommonConvert {

    CommonConvert INSTANCE = Mappers.getMapper(CommonConvert.class);

    MeegoParam customParamToMeegoParam(CustomParam customParam);
}
