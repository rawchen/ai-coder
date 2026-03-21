package com.rawchen.ai.controller;

import cn.hutool.core.io.IoUtil;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.rawchen.ai.config.Constants;
import com.rawchen.ai.convert.TenantAuthConvert;
import com.rawchen.ai.entity.Account;
import com.rawchen.ai.entity.TenantAuth;
import com.rawchen.ai.entity.param.BitCommonContext;
import com.rawchen.ai.entity.param.CommonReq;
import com.rawchen.ai.entity.result.R;
import com.rawchen.ai.entity.vo.TenantAuthVo;
import com.rawchen.ai.mapper.AccountMapper;
import com.rawchen.ai.mapper.TenantAuthMapper;
import com.rawchen.ai.service.TenantAuthService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import javax.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * @author RawChen
 * @date 2023-11-21 11:46
 */
@Slf4j
@RestController
public class MainController {

    @Autowired
    TenantAuthService tenantAuthService;

    @Autowired
    TenantAuthMapper tenantAuthMapper;

    @Autowired
    AccountMapper accountMapper;

    /**
     * 查看租户套餐（1试用带剩余天数 2普通 3高级）
     *
     * @param req
     * @param request
     * @return
     */
    @RequestMapping(value = "/queryPackage")
    public R<TenantAuthVo> select(@RequestBody CommonReq req, HttpServletRequest request) {
        TenantAuthVo vo;
        BitCommonContext context = JSONUtil.toBean(req.getContext(), BitCommonContext.class);
        String tenantKey = context.getBitable().getTenantKey();
        log.info("queryPackage tenantKey: {}", tenantKey);
        TenantAuth tenantAuth = tenantAuthMapper.selectOne(new LambdaQueryWrapper<TenantAuth>().eq(TenantAuth::getTenantKey, tenantKey).last("limit 1"));
        if (tenantAuth != null) {
            tenantAuthService.rowNumberLimit(tenantAuth.getTenantKey());
            tenantAuth = tenantAuthMapper.selectOne(new LambdaQueryWrapper<TenantAuth>().eq(TenantAuth::getTenantKey, tenantKey).last("limit 1"));
        }
        if (tenantAuth == null) {
            // 通过租户获取tenant_auth，如果空的就说明该租户没用过插件，新建实体，设置套餐id为试用1
            TenantAuth tenantAuthNew = new TenantAuth().setTenantKey(tenantKey).setAuthorizationId(1L).setCreatedAt(LocalDateTime.now()).setUpdatedAt(LocalDateTime.now());
            tenantAuthMapper.insert(tenantAuthNew);
            vo = TenantAuthConvert.INSTANCE.tenantAuthToTenantAuthVo(tenantAuthNew);
        } else {
            vo = TenantAuthConvert.INSTANCE.tenantAuthToTenantAuthVo(tenantAuth);
        }
        return R.ok(vo);
    }

    @RequestMapping(value = "/insert")
    public R insert() {
        TenantAuth tenantAuth = new TenantAuth();
        tenantAuth.setTenantKey("ou_123");
        tenantAuth.setAuthorizationId(1L);
        tenantAuth.setCreatedAt(LocalDateTime.now());
        tenantAuth.setUpdatedAt(LocalDateTime.now());
        tenantAuthMapper.insert(tenantAuth);
        return R.ok();
    }

    @RequestMapping(value = "/meego/list")
    public R accountList(@RequestBody Account account) {
        List<Account> accounts = accountMapper.selectList(new LambdaQueryWrapper<Account>().eq(Account::getOpenId, account.getOpenId()));
        return R.ok(accounts);
    }

    @RequestMapping(value = "/meego/delete")
    public R accountdelete(@RequestBody Account account) {
        int update = accountMapper.deleteById(account.getId());
        if (update == 0) {
            return R.fail("修改失败", null);
        } else {
            return R.ok();
        }
    }

    @RequestMapping(value = "/meego/update")
    public R accountUpdate(@RequestBody Account account) {
        account.setUpdatedAt(LocalDateTime.now());
        int update = accountMapper.updateById(account);
        if (update == 0) {
            return R.fail("修改失败", null);
        } else {
            return R.ok();
        }
    }

    /**
     * AI 智能对话接口
     */
    @RequestMapping(value = "/ai/chat")
    public ResponseEntity<StreamingResponseBody> aiChat(@RequestBody Map<String, Object> request) {
        try {
            String model = (String) request.get("model");
            List<Map<String, String>> messages = (List<Map<String, String>>) request.get("messages");
            Boolean stream = request.get("stream") != null ? (Boolean) request.get("stream") : true;
            String responseMode = (String) request.getOrDefault("responseMode", "code");

            String baseUrl;
            String apiKey;
            String modelName;

            if ("deepseek".equals(model)) {
                baseUrl = Constants.DEEPSEEK_BASE_URL;
                apiKey = Constants.DEEPSEEK_API_KEY;
                modelName = "code".equals(responseMode) ? Constants.DEEPSEEK_REASONER_MODEL : Constants.DEEPSEEK_CHAT_MODEL;
            } else if ("kimi".equals(model)) {
                baseUrl = Constants.KIMI_BASE_URL;
                apiKey = Constants.KIMI_API_KEY;
                modelName = Constants.KIMI_MODEL;
            } else if ("glm".equals(model)) {
                baseUrl = Constants.GLM_BASE_URL;
                apiKey = Constants.GLM_API_KEY;
                modelName = Constants.GLM_MODEL;
            } else if ("gpt".equals(model)) {
                baseUrl = Constants.GPT_BASE_URL;
                apiKey = Constants.GPT_API_KEY;
                modelName = Constants.GPT_MODEL;
            } else if ("claude".equals(model)) {
                baseUrl = Constants.CLAUDE_BASE_URL;
                apiKey = Constants.CLAUDE_API_KEY;
                modelName = Constants.CLAUDE_MODEL;
            } else {
                return ResponseEntity.badRequest().build();
            }

            StreamingResponseBody responseBody = outputStream -> {
                URL url = new URL(baseUrl + "/chat/completions");
                HttpURLConnection conn = null;
                InputStream inputStream = null;

                try {
                    conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setRequestProperty("Content-Type", "application/json");
                    conn.setRequestProperty("Authorization", "Bearer " + apiKey);
                    conn.setDoOutput(true);
                    conn.setDoInput(true);

                    Map<String, Object> body = new HashMap<>();
                    body.put("model", modelName);
                    body.put("messages", messages);
                    body.put("stream", stream);
                    body.put("temperature", "simple".equals(responseMode) ? 0.6 : 1);
                    body.put("max_tokens", "simple".equals(responseMode) ? 1024 * 8 : 1024 * 64);
                    Map<String, String> thinking = new HashMap<>();
                    thinking.put("type", "simple".equals(responseMode) ? "disabled" : "enabled");
                    if (!"gpt".equals(model)) {
                        body.put("thinking", thinking);
                    }
                    String jsonBody = JSONUtil.toJsonStr(body);
                    log.info("AI 请求体: {}", jsonBody);

                    try (OutputStream os = conn.getOutputStream()) {
                        byte[] input = jsonBody.getBytes(StandardCharsets.UTF_8);
                        os.write(input, 0, input.length);
                    }

                    int responseCode = conn.getResponseCode();
                    log.info("AI 请求响应码: {}", responseCode);
                    if (responseCode != HttpURLConnection.HTTP_OK) {
                        String error = IoUtil.read(conn.getErrorStream(), StandardCharsets.UTF_8);
                        outputStream.write(("Error: " + error).getBytes(StandardCharsets.UTF_8));
                        return;
                    }
                    inputStream = conn.getInputStream();
                    log.info("开始读取 AI 响应流");
                    byte[] buffer = new byte[4096];
                    int bytesRead;
                    int totalBytes = 0;
                    while ((bytesRead = inputStream.read(buffer)) != -1) {
                        outputStream.write(buffer, 0, bytesRead);
                        outputStream.flush();
                        totalBytes += bytesRead;
                    }
                    log.info("AI 响应流读取完成，总共读取 {} 字节", totalBytes);

                } catch (Exception e) {
                    log.error("AI 请求处理失败，错误类型: {}, 错误信息: {}", e.getClass().getName(), e.getMessage(), e);
                    // 如果是连接关闭异常，说明客户端已断开，无需写入错误信息
                    if (!(e instanceof org.apache.coyote.CloseNowException)) {
                        try {
                            outputStream.write(("Error: " + e.getMessage()).getBytes(StandardCharsets.UTF_8));
                            outputStream.flush();
                        } catch (IOException ioException) {
                            // 客户端已断开，忽略写入失败
                            log.debug("写入错误消息到输出流失败（连接可能已关闭）", ioException);
                        }
                    }
                } finally {
                    if (inputStream != null) {
                        try {
                            inputStream.close();
                        } catch (IOException e) {
                            log.error("关闭输入流失败", e);
                        }
                    }
                    if (conn != null) {
                        conn.disconnect();
                    }
                }
            };

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.TEXT_EVENT_STREAM);
            headers.setCacheControl("no-cache");
            headers.set("Connection", "keep-alive");

            return new ResponseEntity<>(responseBody, headers, HttpStatus.OK);

        } catch (Exception e) {
            log.error("AI 请求初始化失败", e);
            return ResponseEntity.internalServerError().build();
        }
    }

}
