package com.rawchen.ai.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.Objects;
import java.util.stream.Stream;

/**
 * @author RawChen
 * @date 2023-11-22 14:15
 */
@Getter
@AllArgsConstructor
public enum FormTypeEnum {
    WORK_ITEM       (1, "工作项"),
    PLUG_WORK_HOURS (2, "插件工时"),
    TASK_HOURS      (3, "任务工时");

    private Integer code;
    private String desc;

    public static FormTypeEnum getType(Integer code) {
        for (FormTypeEnum enums : FormTypeEnum.values()) {
            if (Objects.equals(enums.getCode(), code)) {
                return enums;
            }
        }
        return null;
    }

    public static FormTypeEnum toType(int code) {
        return Stream.of(FormTypeEnum.values()) .filter(p -> p.getCode() == code).findAny().orElse(null);
    }
}