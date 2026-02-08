package com.rawchen.ai.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.experimental.Accessors;

/**
 * @author RawChen
 * @date 2023-11-28 18:52
 */
@Data
@Accessors(chain = true)
@TableName("limit_package")
public class LimitPackage {

    /**
     * ID
     */
    @TableId(type = IdType.AUTO)
    private Long id;

    /**
     * 套餐类型名称
     */
    private String name;

    /**
     * 限制行数
     */
    private Long rowLimit;
}
