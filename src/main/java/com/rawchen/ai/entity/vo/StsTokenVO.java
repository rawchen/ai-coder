package com.rawchen.ai.entity.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * STS临时凭证响应对象
 *
 * @author RawChen
 * @date 2025-03-17
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StsTokenVO {

    /**
     * 临时AccessKey ID
     */
    private String accessKeyId;

    /**
     * 临时AccessKey Secret
     */
    private String accessKeySecret;

    /**
     * 安全令牌
     */
    private String securityToken;

    /**
     * 过期时间
     */
    private String expiration;

    /**
     * OSS endpoint
     */
    private String endpoint;

    /**
     * Bucket名称
     */
    private String bucketName;

    /**
     * 自定义域名（可选）
     */
    private String customDomain;

    /**
     * 上传目录
     */
    private String uploadFolder;

    /**
     * 地域
     */
    private String region;
}
