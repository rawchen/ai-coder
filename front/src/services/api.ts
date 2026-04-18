import { ApiResponse, MessageContent, ModelType, ResponseMode, SimpleQAMode } from '../types';
import OSS from 'ali-oss';

// OSS STS 凭证类型
interface StsToken {
  accessKeyId: string;
  accessKeySecret: string;
  securityToken: string;
  expiration: string;
  bucketName: string;
  endpoint: string;
  region: string;
  customDomain?: string;
}

// 上传进度回调类型
type UploadProgressCallback = (fileName: string, percent: number) => void;

// OSS STS 凭证类型
interface StsToken {
  accessKeyId: string;
  accessKeySecret: string;
  securityToken: string;
  expiration: string;
  bucketName: string;
  endpoint: string;
  region: string;
  customDomain?: string;
}

// API 配置类型定义
interface ApiConfig {
  baseUrl: string;
  apiKey: string;
  chatModel?: string;
  reasonerModel?: string;
  model?: string;
}

// 后端 API 配置
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

// 代码生成模式系统提示词
const CODE_SYSTEM_PROMPT = `你是一个专业的思考型智能助手，专注于回答全方面的问题。

回复规则：
- 如果涉及代码，需要生成完整的代码项目，保持代码风格一致，遵循最佳实践，代码必须用 \`\`\`language 格式包裹，并在开头第一行使用双斜杠注明文件名（如 \`\`\`javascript + 换行 + // filename.js）`;

// 简单问答模式系统提示词
const SIMPLE_QA_SYSTEM_PROMPT = `你是一个智能助手，专注于回答全方面的问题。请用友好的语气回复，并适当使用 emoji。

回复规则：
- 如果回复内容涉及到计算机相关代码块，代码必须用 \`\`\`language 格式包裹，并强制在代码块开头第一行为代码块起名，强制使用双斜杠注明文件名（如 \`\`\`javascript + 换行 + // filename.js）目的是我能通过正则//匹配这个文件名，所以不管什么Python语言还是GO、Java、Javascript语言等格式的代码块都必须加（强制性）//。
- 如果没有问计算机相关问题，请直接回答问题不一定输出包含代码块。`;

// 获取系统提示词
function getSystemPrompt(responseMode: ResponseMode, simpleQAMode?: SimpleQAMode): string {
  if (responseMode === 'simple') {
    return SIMPLE_QA_SYSTEM_PROMPT;
  }
  return CODE_SYSTEM_PROMPT;
}

// 获取简单问答模式的长度限制提示
function getLengthLimitHint(length: 'short' | 'medium' | 'long'): string {
  const hints = {
    short: '请给出简短的回答，1-2句话即可',
    medium: '请给出适中的回答，包含必要的解释',
    long: '请给出详细的回答，包含完整的分析和示例'
  };
  return hints[length];
}

// 调用 AI API
export async function callAI(
  messages: { role: string; content: string | MessageContent[] }[],
  model: ModelType,
  onStream?: (chunk: string) => void,
  onReasoningStream?: (chunk: string) => void,
  onReasoningComplete?: () => void,
  stream: boolean = true,
  responseMode: ResponseMode = 'code',
  simpleQAMode?: SimpleQAMode
): Promise<ApiResponse> {
  // 获取系统提示词
  let systemPrompt = getSystemPrompt(responseMode, simpleQAMode);

  // 如果是简单问答模式且有长度限制，添加到系统提示词
  if (responseMode === 'simple' && simpleQAMode) {
    systemPrompt += `\n\n${getLengthLimitHint(simpleQAMode.maxResponseLength)}`;
  }

  const requestMessages = [
    {role: 'system', content: systemPrompt},
    ...messages
  ];

  console.log('callAI 请求参数:', {model, stream, responseMode, messageCount: requestMessages.length});

  try {
    const response = await fetch(`${BACKEND_URL}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: requestMessages,
        stream,
        responseMode
      })
    });

    console.log('callAI 响应状态:', response.status, response.statusText);

    if (!response.ok) {
      const error = await response.text();
      console.error('callAI 响应失败:', error);
      return {success: false, error: `API 请求失败: ${error}`};
    }

    // 处理流式响应
    if (stream && onStream && response.body) {
      console.log('开始处理流式响应');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      let fullReasoningContent = '';
      let reasoningStartTime = 0;
      let reasoningEndTime = 0;

      while (true) {
        const {done, value} = await reader.read();
        if (done) {
          console.log('流式响应读取完成');
          break;
        }

        // 解码并追加到缓冲区
        buffer += decoder.decode(value, {stream: true});
        // console.log('收到数据块，当前缓冲区长度:', buffer.length);

        // 检查是否包含错误信息
        if (buffer.includes('Error:')) {
          console.error('流式响应中检测到错误:', buffer);
          const errorMatch = buffer.match(/Error: (.+)/);
          if (errorMatch) {
            return {success: false, error: errorMatch[1].trim()};
          }
        }

        // 按行分割处理
        const lines = buffer.split('\n');
        // 保留最后一行（可能是不完整的）
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta || {};

              // 收集 reasoning_content
              const reasoningContent = delta.reasoning_content || '';
              if (reasoningContent) {
                if (!reasoningStartTime) {
                  reasoningStartTime = Date.now();
                  console.log('思考开始时间已记录:', reasoningStartTime);
                }
                fullReasoningContent += reasoningContent;
                // 调用思考内容流式回调
                if (onReasoningStream) {
                  onReasoningStream(reasoningContent);
                }
              }

              // 收集 content
              const content = delta.content || '';
              if (content && (delta.reasoning_content === null || delta.reasoning_content == undefined)) {
                // 检测到正文开始（content 有值且 (reasoning_content 为 null 或 reasoning_content 不存在)）
                if (!reasoningEndTime && reasoningStartTime) {
                  reasoningEndTime = Date.now();
                  console.log('思考结束，触发完成回调，用时:', Math.round((reasoningEndTime - reasoningStartTime) / 1000));
                  // 调用思考完成回调
                  if (onReasoningComplete) {
                    onReasoningComplete();
                  }
                }
                fullContent += content;
                onStream(content);
              } else if (content) {
                // reasoning_content 不为 null，还在思考中，但继续添加 content
                fullContent += content;
                onStream(content);
              }
            } catch (e) {
              console.error('解析 SSE 数据失败:', data, e);
              // 忽略解析错误
            }
          }
        }
      }

      // 处理缓冲区中剩余的数据
      if (buffer.trim() && buffer.startsWith('data: ')) {
        const data = buffer.slice(6);
        if (data !== '[DONE]') {
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta || {};

            const reasoningContent = delta.reasoning_content || '';
            if (reasoningContent) {
              if (!reasoningStartTime) {
                reasoningStartTime = Date.now();
                console.log('思考开始时间已记录:', reasoningStartTime);
              }
              fullReasoningContent += reasoningContent;
              // 调用思考内容流式回调
              if (onReasoningStream) {
                onReasoningStream(reasoningContent);
              }
            }

            const content = delta.content || '';
            if (content && delta.reasoning_content === null) {
              // 检测到正文开始（content 有值且 reasoning_content 为 null）
              if (!reasoningEndTime && reasoningStartTime) {
                reasoningEndTime = Date.now();
                console.log('思考结束，触发完成回调，用时:', Math.round((reasoningEndTime - reasoningStartTime) / 1000));
                // 调用思考完成回调
                if (onReasoningComplete) {
                  onReasoningComplete();
                }
              }
              fullContent += content;
              onStream(content);
            } else if (content) {
              // reasoning_content 不为 null，还在思考中，但继续添加 content
              fullContent += content;
              onStream(content);
            }
          } catch (e) {
            console.error('解析缓冲区数据失败:', data, e);
            // 忽略解析错误
          }
        }
      }

      // 计算思考时间（秒）
      const thinkingTime = reasoningStartTime && reasoningEndTime
        ? Math.round((reasoningEndTime - reasoningStartTime) / 1000)
        : 0;

      console.log('流式响应处理完成，总内容长度:', fullContent.length, '思考内容长度:', fullReasoningContent.length, '思考时间:', thinkingTime);
      return {
        success: true,
        content: fullContent,
        reasoning_content: fullReasoningContent,
        thinking_time: thinkingTime
      };
    } else {
      // 处理非流式响应
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      return {success: true, content};
    }
  } catch (error) {
    return {success: false, error: `请求失败: ${error}`};
  }
}

// 分析项目文件
export function analyzeProjectFiles(files: File[]): Promise<string> {
  return new Promise((resolve) => {
    const fileInfos: string[] = [];
    let processed = 0;

    if (files.length === 0) {
      resolve('没有上传文件');
      return;
    }

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const lines = content.split('\n');

        // 分析文件内容
        const analysis = {
          filename: file.name,
          size: file.size,
          lines: lines.length,
          imports: lines.filter(l => l.includes('import ') || l.includes('require(')).length,
          exports: lines.filter(l => l.includes('export ')).length,
          functions: (content.match(/function\s+\w+|const\s+\w+\s*=\s*\(|=>\s*{/g) || []).length,
          classes: (content.match(/class\s+\w+/g) || []).length
        };

        fileInfos.push(`
文件: ${analysis.filename}
- 大小: ${(analysis.size / 1024).toFixed(2)} KB
- 行数: ${analysis.lines}
- 导入语句: ${analysis.imports}
- 导出语句: ${analysis.exports}
- 函数/方法: ${analysis.functions}
- 类: ${analysis.classes}
`);

        processed++;
        if (processed === files.length) {
          resolve(`项目分析结果：\n${fileInfos.join('\n')}`);
        }
      };
      reader.readAsText(file);
    });
  });
}

// 提取代码块
export function extractCodeBlocks(content: string): { language: string; code: string; filename?: string }[] {
  const blocks: { language: string; code: string; filename?: string }[] = [];
  extractCodeBlocksInner(content, blocks, false);
  return blocks;
}

function extractCodeBlocksInner(content: string, blocks: {
  language: string;
  code: string;
  filename?: string
}[], isInner: boolean): void {
  // 允许代码块前有任意空白缩进
  const openRegex = /([ \t]*)(`{3,})(\w+)?(?:\s*\/\/\s*(.+))?\n/g;
  let pos = 0;

  while (pos < content.length) {
    openRegex.lastIndex = pos;
    const openMatch = openRegex.exec(content);

    if (!openMatch) break;

    const indent = openMatch[1] || '';
    const backticks = openMatch[2];
    const lang = openMatch[3] || 'plaintext';
    const filename = openMatch[4]?.trim();
    const codeStart = openMatch.index + openMatch[0].length;

    // 查找匹配的闭合反引号（允许前面有相同的缩进或更少）
    const escapedBackticks = backticks.replace(/`/g, '\\`');
    const closeRegex = new RegExp(`\\n[ \\t]*${escapedBackticks}(?=\\s*\\n|$)`);
    const closeMatch = closeRegex.exec(content.slice(codeStart));

    if (closeMatch) {
      const codeContent = content.slice(codeStart, codeStart + closeMatch.index).trim();

      // 如果是 md/markdown 包裹，递归解析内部内容
      if ((lang === 'md' || lang === 'markdown') && !isInner) {
        extractCodeBlocksInner(codeContent, blocks, true);
      } else {
        blocks.push({
          language: lang,
          filename,
          code: codeContent
        });
      }

      pos = codeStart + closeMatch.index + closeMatch[0].length;
    } else {
      // 未闭合的代码块
      blocks.push({
        language: lang,
        filename,
        code: content.slice(codeStart).trim()
      });
      break;
    }
  }
}

// 智能推测语言
export function detectLanguage(code: string): string {
  const patterns: { [key: string]: RegExp[] } = {
    javascript: [/const\s+\w+\s*=/, /let\s+\w+\s*=/, /function\s+\w+\s*\(/, /=>\s*{/],
    typescript: [/interface\s+\w+/, /type\s+\w+\s*=/, /:\s*(string|number|boolean)/, /<\w+>/],
    python: [/def\s+\w+\s*\(/, /import\s+\w+/, /from\s+\w+\s+import/, /if\s+__name__/],
    java: [/public\s+class/, /private\s+\w+/, /System\.out\./, /void\s+main/],
    go: [/func\s+\w+\s*\(/, /package\s+\w+/, /import\s+\(/, /fmt\./],
    rust: [/fn\s+\w+\s*\(/, /let\s+mut/, /impl\s+\w+/, /use\s+\w+/],
    cpp: [/#include\s*</, /std::/, /int\s+main\s*\(/, /cout\s*<</],
    html: [/<html/, /<div/, /<body/, /<head/],
    css: [/\{[\s\S]*?:[\s\S]*?;[\s\S]*?\}/, /@media/, /\.[\w-]+\s*\{/],
    sql: [/SELECT\s+/i, /INSERT\s+INTO/i, /CREATE\s+TABLE/i, /FROM\s+\w+/i]
  };

  for (const [lang, regexes] of Object.entries(patterns)) {
    const matches = regexes.filter(r => r.test(code)).length;
    if (matches >= 2) return lang;
  }

  return 'plaintext';
}

// 生成对话标题
export async function generateConversationTitle(conversationContent: string): Promise<string> {
  // console.log('generateConversationTitle 请求参数:', conversationContent);

  // 如果对话内容为空，返回默认标题
  if (!conversationContent.trim()) {
    return '新对话';
  }

  // 限制对话内容长度
  const truncatedContent = conversationContent.length > 2000
    ? conversationContent.slice(0, 2000) + '...'
    : conversationContent;

  try {
    const response = await fetch(`${BACKEND_URL}/ai/generateTitle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        conversation: truncatedContent
      })
    });

    console.log('generateConversationTitle 响应状态:', response.status, response.statusText);

    if (!response.ok) {
      const error = await response.text();
      console.error('generateConversationTitle 响应失败:', error);
      // 如果请求失败，返回简单的截断标题
      return conversationContent.slice(0, 15) + (conversationContent.length > 15 ? '...' : '');
    }

    const data = await response.json();
    const title = data.data || data.result || '';

    // 确保标题不为空
    if (!title.trim()) {
      return conversationContent.slice(0, 15) + (conversationContent.length > 15 ? '...' : '');
    }

    return title;
  } catch (error) {
    console.error('generateConversationTitle 请求失败:', error);
    // 如果请求失败，返回简单的截断标题
    return conversationContent.slice(0, 15) + (conversationContent.length > 15 ? '...' : '');
  }
}

// 获取STS临时凭证
export async function getStsToken(): Promise<StsToken> {
  const response = await fetch(`${BACKEND_URL}/oss/sts-token`);
  const data = await response.json();

  if (data.code !== 200) {
    throw new Error(data.msg || '获取STS凭证失败');
  }

  return data.data;
}

// 上传文件到OSS
export async function uploadFileToOSS(
  file: File,
  onProgress?: UploadProgressCallback
): Promise<string> {
  const stsToken = await getStsToken();

  // 生成唯一文件名
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const fileExt = file.name.split('.').pop() || '';
  const objectKey = `temp/${timestamp}_${randomStr}.${fileExt}`;

  // 使用OSS SDK上传
  // const OSS = require('ali-oss');

  const client = new OSS({
    region: stsToken.region,
    accessKeyId: stsToken.accessKeyId,
    accessKeySecret: stsToken.accessKeySecret,
    stsToken: stsToken.securityToken,
    bucket: stsToken.bucketName,
    secure: true
  });

  // // 分片上传配置
  // const options = {
  //   progress: (p: number) => {
  //     if (onProgress) {
  //       onProgress(file.name, Math.floor(p * 100));
  //     }
  //   },
  //   partSize: 1024 * 1024 // 1MB分片
  // };

  try {
    const result = await client.put(objectKey, file);

    // 返回文件URL
    if (stsToken.customDomain) {
      return `https://${stsToken.customDomain}/${objectKey}`;
    } else {
      return result.url || `https://${stsToken.bucketName}.${stsToken.endpoint}/${objectKey}`;
    }
  } catch (error) {
    console.error('上传文件失败:', error);
    throw new Error(`上传文件失败: ${error}`);
  }
}

// 批量上传文件到OSS
export async function uploadFilesToOSS(
  files: File[],
  onProgress?: UploadProgressCallback
): Promise<string[]> {
  const uploadPromises = files.map(file => uploadFileToOSS(file, onProgress));
  return Promise.all(uploadPromises);
}

// 判断文件是否为图像文件
export function isImageFile(file: File): boolean {
  const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  return imageTypes.includes(file.type);
}

// 判断文件是否为代码文件
export function isCodeFile(file: File): boolean {
  const codeExtensions = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'go', 'rs', 'cpp', 'c', 'h', 'html', 'css', 'json', 'xml', 'yaml', 'yml', 'md', 'txt'];
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return codeExtensions.includes(ext);
}