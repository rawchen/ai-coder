package com.rawchen.ai.controller;

import com.rawchen.ai.entity.R;
import com.rawchen.ai.entity.vo.StsTokenVO;
import com.rawchen.ai.service.OssStsService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

/**
 * 阿里云OSS文件上传控制器
 * 使用STS临时凭证实现前端直传
 *
 * @author RawChen
 * @date 2025-03-17
 */
@Slf4j
@Controller
public class FileUploadOssController {

    @Autowired
    private OssStsService ossStsService;

    /**
     * 获取STS临时凭证
     * 前端使用此凭证直接上传文件到OSS，不经过服务器
     */
    @ResponseBody
    @GetMapping("/oss/sts-token")
    public R getStsToken() {
        try {
            StsTokenVO stsToken = ossStsService.getStsToken();
            log.info("成功获取STS临时凭证, 过期时间: {}", stsToken.getExpiration());
            return R.ok(stsToken);
        } catch (Exception e) {
            log.error("获取STS临时凭证失败", e);
            return R.fail("获取上传凭证失败: " + e.getMessage());
        }
    }
}
