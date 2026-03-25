package com.rawchen.ai.controller;

import cn.hutool.core.io.IoUtil;
import cn.hutool.json.JSONUtil;
import com.rawchen.ai.config.Constants;
import com.rawchen.ai.entity.result.R;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
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

    /**
     * AI 生成对话标题
     */
    @RequestMapping(value = "/ai/generateTitle")
    public R<String> generateTitle(@RequestBody Map<String, Object> request) {
        try {
            String conversationContent = (String) request.get("conversation");
            if (conversationContent == null || conversationContent.trim().isEmpty()) {
                return R.fail("对话内容不能为空", null);
            }

            // 限制对话内容长度，避免token超限
            String truncatedContent = conversationContent.length() > 2000
                    ? conversationContent.substring(0, 2000) + "..."
                    : conversationContent;

            // 构建生成标题的提示词
            String systemPrompt = "# 角色设定\n" +
                    "你是专注于对话内容提炼的智能总结助手，隶属于高效信息处理服务体系，核心职责是从用户和AI对话文本中精准提取核心信息，生成简洁、直观的总结标题，帮助用户快速把握对话核心内容。\n" +
                    "\n" +
                    "# 执行准则\n" +
                    "- **必做事项**：标题必须完全基于对话内容生成，不得添加对话外的信息；标题需包含对话的核心主体与关键事件，核心主题必须精简。\n" +
                    "- **约束条件**：禁止使用模糊性词汇（如“交流”“讨论”等无实质内容的表述）；禁止遗漏对话中的关键人物或核心动作；禁止使用疑问句或感叹句作为标题。\n" +
                    "\n" +
                    "# 输入处理规则\n" +
                    "- 优先读取对话中的高频关键词、核心动作与关键人物；\n" +
                    "- 若对话存在多主题，以出现频率最高或逻辑优先级最高的主题为核心；\n" +
                    "- 若对话内容为空或无有效信息，直接输出“ ”空字符串。\n" +
                    "- 若出现应该、如何这些疑问词，则带有建议。\n" +
                    "\n" +
                    "# 操作流程\n" +
                    "1. **核心信息提取**：扫描对话文本，标记出关键主语、核心动作（如“咨询”“投诉”“建议”）、关键事件（如“申请”“产品”）；\n" +
                    "2. **主题整合**：将提取的关键信息按“主语+动作+事件”的逻辑进行组合，形成初步标题框架；\n" +
                    "3. **精简优化**：删除冗余词汇，精简主语，调整语序，确保表意清晰，字数控制在5-10字左右；\n" +
                    "4. **合规校验**：检查标题是否符合执行准则，若不符合则返回步骤1重新提取。\n" +
                    "\n" +
                    "# 输出规范\n" +
                    "- 输出结构：仅输出总结标题，无需附加任何解释性内容；\n" +
                    "- 语言风格：使用陈述性短句，简洁明了；\n" +
                    "- 字数限制：控制在5-10左右；\n";

            List<Map<String, String>> messages = new ArrayList<>();
            Map<String, String> systemMsg = new HashMap<>();
            systemMsg.put("role", "system");
            systemMsg.put("content", systemPrompt);
            messages.add(systemMsg);

            Map<String, String> userMsg = new HashMap<>();
            userMsg.put("role", "user");
            userMsg.put("content", "请为以下对话生成一个标题：\n\n" + truncatedContent);
            messages.add(userMsg);

            URL url = new URL(Constants.DEEPSEEK_BASE_URL + "/chat/completions");
            HttpURLConnection conn = null;
            InputStream inputStream = null;

            try {
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("Authorization", "Bearer " + Constants.DEEPSEEK_API_KEY);
                conn.setDoOutput(true);
                conn.setDoInput(true);

                Map<String, Object> body = new HashMap<>();
                body.put("model", Constants.DEEPSEEK_CHAT_MODEL);
                body.put("messages", messages);
                body.put("stream", false);
                body.put("temperature", 0.7);
                body.put("max_tokens", 20);
                String jsonBody = JSONUtil.toJsonStr(body);
                log.info("标题生成请求体: {}", jsonBody);

                try (OutputStream os = conn.getOutputStream()) {
                    byte[] input = jsonBody.getBytes(StandardCharsets.UTF_8);
                    os.write(input, 0, input.length);
                }

                int responseCode = conn.getResponseCode();
                log.info("标题生成响应码: {}", responseCode);

                if (responseCode != HttpURLConnection.HTTP_OK) {
                    String error = IoUtil.read(conn.getErrorStream(), StandardCharsets.UTF_8);
                    log.error("标题生成失败: {}", error);
                    return R.fail("标题生成失败: " + error, null);
                }

                inputStream = conn.getInputStream();
                String responseText = IoUtil.read(inputStream, StandardCharsets.UTF_8);
                log.info("标题生成响应: {}", responseText);

                // 解析响应
                Map<String, Object> responseJson = JSONUtil.toBean(responseText, Map.class);
                List<Map<String, Object>> choices = (List<Map<String, Object>>) responseJson.get("choices");
                if (choices != null && !choices.isEmpty()) {
                    Map<String, Object> choice = choices.get(0);
                    Map<String, String> message = (Map<String, String>) choice.get("message");
                    String title = message != null ? message.get("content") : null;

                    if (title != null) {
                        // 清理标题，移除可能的标点符号和多余空格
                        title = title.trim().replaceAll("[，。！？、；：,.!?;:]", "");
                        // 限制标题长度
//                        if (title.length() > 15) {
//                            title = title.substring(0, 15);
//                        }
                        log.info("生成的标题: {}", title);
                        return R.ok(title);
                    }
                }

                return R.fail("标题生成失败: 响应格式错误", null);

            } catch (Exception e) {
                log.error("标题生成请求处理失败", e);
                return R.fail("标题生成失败: " + e.getMessage(), null);
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
        } catch (Exception e) {
            log.error("标题生成初始化失败", e);
            return R.fail("标题生成初始化失败: " + e.getMessage(), null);
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
