package com.rawchen.ai.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.rawchen.ai.entity.Account;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

/**
 * @author RawChen
 * @date 2023-11-28 10:10
 */
@Mapper
public interface AccountMapper extends BaseMapper<Account> {

    default List<Account> selectAll() {
        return selectList(new LambdaQueryWrapper<>());
    }
}
