package com.rawchen.ai.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.experimental.Accessors;

import java.time.LocalDateTime;

/**
 * @author RawChen
 * @date 2023-11-28 16:57
 */
@Data
@Accessors(chain = true)
@TableName("account")
public class Account {

    /**
     * ID
     */
    @TableId(type = IdType.AUTO)
    private Long id;

    /**
     * 用户ID
     */
    @TableField("open_id")
    private String openId;

    /**
     * 名称
     */
    @TableField("name")
    private String name;

    /**
     * 租户KEY
     */
    @TableField("tenant_key")
    private String tenantKey;

    /**
     * 用户KEY
     */
    @TableField("user_key")
    private String userKey;

    /**
     * 插件ID
     */
    @TableField("plugin_id")
    private String pluginId;

    /**
     * 插件秘钥
     */
    @TableField("plugin_secret")
    private String pluginSecret;

    /**
     * 创建时间
     */
    @TableField("created_at")
    private LocalDateTime createdAt;

    /**
     * 修改时间
     */
    @TableField("updated_at")
    private LocalDateTime updatedAt;

}
