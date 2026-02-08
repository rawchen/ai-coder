package com.rawchen.ai;

import cn.hutool.core.util.CharsetUtil;
import cn.hutool.crypto.Mode;
import cn.hutool.crypto.Padding;
import cn.hutool.crypto.SecureUtil;
import cn.hutool.crypto.asymmetric.KeyType;
import cn.hutool.crypto.asymmetric.RSA;
import cn.hutool.crypto.digest.DigestUtil;
import cn.hutool.crypto.symmetric.AES;
import cn.hutool.crypto.symmetric.DES;
import com.rawchen.ai.config.Constants;
import com.rawchen.ai.entity.ProjectUser;
import com.rawchen.ai.entity.WorkItemPage;
import com.rawchen.ai.entity.param.CommonReq;
import com.rawchen.ai.entity.param.MeegoParam;
import com.rawchen.ai.service.MeegoService;
import com.rawchen.ai.service.TenantAuthService;
import com.rawchen.ai.util.SignUtil;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.util.StreamUtils;

import java.io.UnsupportedEncodingException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * @author RawChen
 * @date 2023-11-22 10:25
 */
@SpringBootTest
public class AppTest {

    @Autowired
    TenantAuthService tenantAuthService;

    @Test
    void test04() {
        MeegoParam meegoParam = new MeegoParam();
        meegoParam.setPluginId("xx");
        meegoParam.setPluginSecret("xx");
        meegoParam.setUserKey("xx");
//        String token = SignUtil.token(meegoParam);
//        System.out.println(token);
    }

    @Test
    void test06() {
        Long result01 = tenantAuthService.rowNumberLimit("ou_1");
        System.out.println(result01);
        Long result02 = tenantAuthService.rowNumberLimit("ou_2");
        System.out.println(result02);
        Long result03 = tenantAuthService.rowNumberLimit("ou_3");
        System.out.println(result03);
        Long result04 = tenantAuthService.rowNumberLimit("ou_4");
        System.out.println(result04);
        Long result05 = tenantAuthService.rowNumberLimit("ou_5");
        System.out.println(result05);
        Long result06 = tenantAuthService.rowNumberLimit("ou_6");
        System.out.println(result06);

    }

    @Test
    void test07() throws UnsupportedEncodingException {
        String content = "xxx";
        String key = DigestUtil.md5Hex(Constants.SECRET_KEY);
        System.out.println(key);

        // 构建
        AES aes = SecureUtil.aes(key.getBytes());

        // 加密
        byte[] encrypt = aes.encrypt(content);
        // 解密
        byte[] decrypt = aes.decrypt(encrypt);

        // 加密为16进制表示
        String res = aes.encryptHex(content);
        System.out.println(res);

        // 解密为字符串
        String decryptStr = aes.decryptStr(res, CharsetUtil.CHARSET_UTF_8);
        System.out.println(decryptStr);
    }

    @Test
    void test08() {
//        String text = "{\"datasourceConfig\":\"{\\\"url\\\":\\\"http://xxx.cc\\\",\\\"acctId\\\":\\\"xxx\\\",\\\"username\\\":\\\"demo\\\",\\\"password\\\":\\\"xxx\\\",\\\"orgId\\\":\\\"\\\",\\\"number\\\":\\\"\\\",\\\"transactionID\\\":\\\"\\\",\\\"pageToken\\\":\\\"\\\",\\\"maxPageSize\\\":\\\"\\\"}\"}";
//        DES des = new DES(Mode.ECB, Padding.PKCS5Padding, Constants.SECRET_KEY.getBytes());
//        String result = des.encryptHex(text, StandardCharsets.UTF_8);
//        System.out.println("加密后的输出：" + result);
//        System.out.println(SignUtil.decrypt(result));
        String text = "{\"datasourceConfig\":\"{\\\"url\\\":\\\"http://xxx.cc\\\",\\\"acctId\\\":\\\"xxx\\\",\\\"username\\\":\\\"demo\\\",\\\"password\\\":\\\"xxx\\\",\\\"orgId\\\":\\\"\\\",\\\"number\\\":\\\"\\\",\\\"transactionID\\\":\\\"\\\",\\\"pageToken\\\":\\\"\\\",\\\"maxPageSize\\\":\\\"\\\"}\"}";
        DES des = new DES(Mode.ECB, Padding.PKCS5Padding, Constants.SECRET_KEY.getBytes());
        String result = des.encryptHex(text, StandardCharsets.UTF_8);
        System.out.println("加密后的输出：" + result);
        System.out.println(SignUtil.decrypt(result));
    }

    @Test
    void test09() throws Exception {
        String a = "";
        String decrypt = SignUtil.decrypt(a);
        System.out.println(decrypt);
    }

    @Test
    void test11() throws Exception {
//        String publicKey = "";
//        String privateKey = "";
        String publicKey = StreamUtils.copyToString(new ClassPathResource("public.txt").getInputStream(), Charset.defaultCharset());
        String privateKey = StreamUtils.copyToString(new ClassPathResource("private.txt").getInputStream(), Charset.defaultCharset());

        RSA rsa = SecureUtil.rsa(privateKey, publicKey);
        String result = rsa.encryptHex("xxx", KeyType.PublicKey);
        System.out.println("加密结果：" + result);

        System.out.println(SignUtil.rsaDecrypt(result));
    }

}
