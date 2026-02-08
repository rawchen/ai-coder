package com.rawchen.ai.util;

import cn.hutool.core.util.ArrayUtil;
import cn.hutool.core.util.StrUtil;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.rawchen.ai.config.Constants;
import com.rawchen.ai.entity.*;
import lombok.extern.slf4j.Slf4j;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * @author RawChen
 * @date 2023-11-24 14:40
 */
@Slf4j
public class StringUtil {

    /**
     * 13位时间戳转自定义格式日期字符串
     *
     * @param instanceOperateTime   13位时间戳
     * @param pattern               yyyy/MM/dd HH:mm:ss
     * @return
     */
    public static String timestampToYearMonthDayHourMinuteSecond(Long instanceOperateTime, String pattern) {
        LocalDateTime operateTime;
        if (StrUtil.isEmpty(String.valueOf(instanceOperateTime)) || String.valueOf(instanceOperateTime).length() != 13) {
            log.error("13位时间戳格式出错：{}", instanceOperateTime);
            operateTime = LocalDateTime.now();
        } else {
            operateTime = LocalDateTime.ofInstant(Instant.ofEpochMilli(instanceOperateTime), ZoneId.systemDefault());
        }
        return operateTime.format(DateTimeFormatter.ofPattern(pattern));
    }

    public static String yearMonthDayHourMinuteSecondToTimestamp(String instanceOperateTime) {
        LocalDateTime operateTime = LocalDateTime.now();
        try {
            operateTime = LocalDateTime.parse(instanceOperateTime, DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm:ss"));
        } catch (Exception e) {
            log.error("时间解析出错", e);
        }
        long milliseconds = operateTime.atZone(ZoneOffset.systemDefault()).toInstant().toEpochMilli();
        return String.valueOf(milliseconds);
    }

    public static Long dealTimestamp(Long timestamp) {
        if (timestamp == null || timestamp == 0) {
            return null;
        } else {
            return timestamp;
        }
    }

    public static String getChildrenLabel(TreeSelect treeSelect) {
        StringBuilder sb = new StringBuilder();
        sb.append(treeSelect.getLabel());
        if (treeSelect.getChildren() != null) {
            sb.append("/");
//            sb.append(treeSelect.getChildren().getLabel());
            sb.append(getChildrenLabel(treeSelect.getChildren()));
        }
        return sb.toString();
    }

    public static String dealUserName(List<ProjectUser> projectUsers, String s) {
        if (ArrUtil.isEmpty(projectUsers)) {
            return s;
        }
        if (StrUtil.isEmpty(s)) {
            return null;
        } else {
            List<ProjectUser> collect = projectUsers.stream().filter(u -> s.equals(u.getUserKey())).collect(Collectors.toList());
            if (collect.size() != 1) {
                log.error("匹配数量不唯一：{}", collect);
                return s;
            } else {
                return collect.get(0).getNameCn();
            }
        }
    }

    public static Object dealUserNameMulti(List<ProjectUser> projectUsers, String fieldValue) {
        try {
            if (StrUtil.isEmpty(fieldValue)) {
                return null;
            }
            JSONArray jsonArray = JSONArray.parseArray(fieldValue);
            if (ArrUtil.isEmpty(jsonArray)) {
                return null;
            }
            List<String> javaList = jsonArray.toJavaList(String.class);
            if (ArrUtil.isEmpty(javaList)) {
                return null;
            }
            List<ProjectUser> collect = projectUsers.stream().filter(u -> javaList.contains(u.getUserKey())).collect(Collectors.toList());
            if (ArrUtil.isEmpty(collect)) {
                return null;
            }
            List<String> stringList = collect.stream().map(ProjectUser::getNameCn).collect(Collectors.toList());
            return String.join(",", stringList);
        } catch (Exception e) {
            log.error("dealUserNameMulti方法异常：", e);
            return null;
        }
    }

    public static String subLog(String resultStr) {
        return subLog(resultStr, 100);
    }

    public static String subLog(String resultStr, int number) {
        if (StrUtil.isEmpty(resultStr)) {
            return "";
        }
        return resultStr.length() > number ? resultStr.substring(0, number) + "..." : resultStr;
    }

}
