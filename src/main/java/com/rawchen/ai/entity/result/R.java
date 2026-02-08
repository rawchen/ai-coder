package com.rawchen.ai.entity.result;

import lombok.Data;

import java.io.Serializable;

/**
 * @author RawChen
 * @date 2023-11-22 13:38
 */
@Data
public class R<T> implements Serializable {

    private Integer code;

    private String msg;

    private T data;

    public R(Integer code, String msg) {
        this.code = code;
        this.msg = msg;
        this.data = null;
    }

    public R(Integer code, String msg, T data) {
        this.code = code;
        this.msg = msg;
        this.data = data;
    }

    public static R ok() {
        return new R<>(0, "ok");
    }

    public static <T> R<T> ok(T data) {
        return new R<>(0, "ok", data);
    }

    public static R fail() {
        return new R<>(400, "fail");
    }

    public static <T> R<T> fail(String msg, T data) {
        return new R<>(400, msg, data);
    }

    public static <T> R<T> fail(T data) {
        return new R<>(400, "fail", data);
    }
}
