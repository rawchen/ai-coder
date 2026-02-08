package com.rawchen.ai.util;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.CharsetUtil;
import cn.hutool.core.util.StrUtil;
import cn.hutool.crypto.SecureUtil;
import cn.hutool.crypto.asymmetric.KeyType;
import cn.hutool.crypto.asymmetric.RSA;
import cn.hutool.crypto.symmetric.DES;
import cn.hutool.http.HttpRequest;
import cn.hutool.http.HttpResponse;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.rawchen.ai.config.Constants;
import com.rawchen.ai.entity.*;
import com.rawchen.ai.entity.param.MeegoParam;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.util.StreamUtils;

import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.stream.Collectors;

/**
 * @author RawChen
 * @date 2023-11-22 10:18
 */
@Slf4j
public class SignUtil {

    public static String genPostRequestSignature(String nonce, String timestamp, String body, String secretKey) {
        String str = "";
        str += timestamp;
        str += nonce;
        str += secretKey;
        str += body;

        byte[] bytes = str.getBytes();
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-1");
            digest.update(bytes);
            byte[] sha1Bytes = digest.digest();
            return bytesToHexString(sha1Bytes);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException(e);
        }
    }

    public static String bytesToHexString(byte[] bytes) {
        StringBuilder hexString = new StringBuilder();
        for (byte b : bytes) {
            String hex = Integer.toHexString(b & 0xFF);
            if (hex.length() == 1) {
                hexString.append('0');
            }
            hexString.append(hex);
        }
        return hexString.toString();
    }

    public static String decrypt(String params) {
        try {
            if (StrUtil.isEmpty(params)) {
                return "";
            }
            DES des = new DES(Constants.SECRET_KEY.getBytes(StandardCharsets.UTF_8));
            log.info("解密结果: {}", des.decryptStr(params, CharsetUtil.CHARSET_UTF_8));
            return des.decryptStr(params, CharsetUtil.CHARSET_UTF_8);
        } catch (Exception e) {
            log.error("解密异常", e);
            return "";
        }
    }

    public static String rsaDecrypt(String text) {
        try {
            String publicKey = StreamUtils.copyToString(new ClassPathResource("public.txt").getInputStream(), Charset.defaultCharset());
            String privateKey = StreamUtils.copyToString(new ClassPathResource("private.txt").getInputStream(), Charset.defaultCharset());

            RSA rsa = SecureUtil.rsa(privateKey, publicKey);
            String result = rsa.decryptStr(text, KeyType.PrivateKey);
            log.info("解密结果：{}", result);
            return result;
        } catch (IOException e) {
            log.error("解密异常：", e);
            return "";
        }
    }

    private static <T> Predicate<T> distinctByKey(Function<? super T, Object> keyExtractor) {
        Map<Object, Boolean> seen = new ConcurrentHashMap<>();
        return t -> seen.putIfAbsent(keyExtractor.apply(t), Boolean.TRUE) == null;
    }
}
